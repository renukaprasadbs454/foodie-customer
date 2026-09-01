package com.foodie.notification.listener;

import com.foodie.common.enums.NotificationEventType;
import com.foodie.common.enums.OrderStatus;
import com.foodie.notification.service.NotificationService;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import com.foodie.shared.contract.OrderNotificationQuery;
import com.foodie.shared.contract.PaymentOrderLookup;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import com.foodie.shared.event.DeliveryPartnerAssignedEvent;
import com.foodie.shared.event.OrderCancelledEvent;
import com.foodie.shared.event.OrderConfirmedEvent;
import com.foodie.shared.event.OrderDeliveredEvent;
import com.foodie.shared.event.OrderPlacedEvent;
import com.foodie.shared.event.OrderStatusChangedEvent;
import com.foodie.shared.event.PaymentFailedEvent;
import com.foodie.shared.event.PayoutRequestedEvent;
import com.foodie.shared.event.RefundProcessedEvent;
import com.foodie.shared.event.RestaurantApprovedEvent;
import com.foodie.shared.event.RestaurantCreatedEvent;
import com.foodie.shared.event.RestaurantSuspendedEvent;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Consumes domain events AFTER_COMMIT so Notification/FCM failures never roll back business txs.
 */
@Component
public class DomainNotificationListeners {

    private static final Logger log = LoggerFactory.getLogger(DomainNotificationListeners.class);

    private final NotificationService notificationService;
    private final OrderNotificationQuery orderNotificationQuery;
    private final CustomerSummaryProvider customerSummaryProvider;
    private final RestaurantSummaryProvider restaurantSummaryProvider;
    private final DeliveryPartnerLookup deliveryPartnerLookup;
    private final PaymentOrderLookup paymentOrderLookup;

    public DomainNotificationListeners(
            NotificationService notificationService,
            OrderNotificationQuery orderNotificationQuery,
            CustomerSummaryProvider customerSummaryProvider,
            RestaurantSummaryProvider restaurantSummaryProvider,
            DeliveryPartnerLookup deliveryPartnerLookup,
            PaymentOrderLookup paymentOrderLookup
    ) {
        this.notificationService = notificationService;
        this.orderNotificationQuery = orderNotificationQuery;
        this.customerSummaryProvider = customerSummaryProvider;
        this.restaurantSummaryProvider = restaurantSummaryProvider;
        this.deliveryPartnerLookup = deliveryPartnerLookup;
        this.paymentOrderLookup = paymentOrderLookup;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        safeRun(() -> {
            var order = orderNotificationQuery.findByOrderId(event.orderId()).orElse(null);
            String orderNumber = order != null ? order.orderNumber() : event.orderId().toString();
            restaurantSummaryProvider.findOwnerUserCredentialIdByRestaurantId(event.restaurantId())
                    .ifPresent(ownerId -> notificationService.send(
                            ownerId,
                            NotificationEventType.ORDER_PLACED,
                            Map.of("orderNumber", orderNumber, "orderId", event.orderId().toString())
                    ));
        });
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderConfirmed(OrderConfirmedEvent event) {
        safeRun(() -> notifyCustomer(event.orderId(), NotificationEventType.ORDER_CONFIRMED, Map.of()));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderStatusChanged(OrderStatusChangedEvent event) {
        safeRun(() -> {
            if (!shouldNotifyStatus(event.toStatus())) {
                return;
            }
            notifyCustomer(event.orderId(), NotificationEventType.ORDER_STATUS_CHANGED, Map.of(
                    "fromStatus", event.fromStatus().name(),
                    "toStatus", event.toStatus().name()
            ));
        });
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCancelled(OrderCancelledEvent event) {
        safeRun(() -> {
            var order = orderNotificationQuery.findByOrderId(event.orderId()).orElse(null);
            if (order == null) {
                return;
            }
            Map<String, String> params = baseOrderParams(order.orderNumber(), order.orderId());
            customerCredential(order.customerId()).ifPresent(id ->
                    notificationService.send(id, NotificationEventType.ORDER_CANCELLED, params));
            restaurantSummaryProvider.findOwnerUserCredentialIdByRestaurantId(order.restaurantId())
                    .ifPresent(id -> notificationService.send(id, NotificationEventType.ORDER_CANCELLED, params));
        });
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderDelivered(OrderDeliveredEvent event) {
        safeRun(() -> notifyCustomer(event.orderId(), NotificationEventType.ORDER_DELIVERED, Map.of()));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaymentFailed(PaymentFailedEvent event) {
        safeRun(() -> notifyCustomer(event.orderId(), NotificationEventType.PAYMENT_FAILED, Map.of(
                "paymentId", event.paymentId().toString()
        )));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRefundProcessed(RefundProcessedEvent event) {
        safeRun(() -> {
            UUID orderId = paymentOrderLookup.findOrderIdByPaymentId(event.paymentId()).orElse(null);
            if (orderId == null) {
                return;
            }
            notifyCustomer(orderId, NotificationEventType.REFUND_PROCESSED, Map.of(
                    "amount", event.amount().toPlainString(),
                    "refundRequestId", event.refundRequestId().toString()
            ));
        });
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onDeliveryPartnerAssigned(DeliveryPartnerAssignedEvent event) {
        safeRun(() -> {
            var order = orderNotificationQuery.findByOrderId(event.orderId()).orElse(null);
            if (order == null) {
                return;
            }
            Map<String, String> params = baseOrderParams(order.orderNumber(), order.orderId());
            customerCredential(order.customerId()).ifPresent(id ->
                    notificationService.send(id, NotificationEventType.DELIVERY_PARTNER_ASSIGNED, params));
            deliveryPartnerLookup.findUserCredentialIdByPartnerId(event.deliveryPartnerId())
                    .ifPresent(id -> notificationService.send(id, NotificationEventType.DELIVERY_OFFER, params));
        });
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRestaurantCreated(RestaurantCreatedEvent event) {
        safeRun(() -> notificationService.send(
                event.ownerUserCredentialId(),
                NotificationEventType.RESTAURANT_CREATED,
                Map.of(
                        "restaurantName", event.name() == null ? "" : event.name(),
                        "restaurantId", event.restaurantId().toString()
                )
        ));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRestaurantApproved(RestaurantApprovedEvent event) {
        safeRun(() -> restaurantSummaryProvider
                .findOwnerUserCredentialIdByRestaurantId(event.restaurantId())
                .ifPresent(ownerId -> {
                    String name = restaurantSummaryProvider.findByRestaurantId(event.restaurantId())
                            .map(RestaurantSummaryProvider.RestaurantSummary::name)
                            .orElse("");
                    notificationService.send(ownerId, NotificationEventType.RESTAURANT_APPROVED, Map.of(
                            "restaurantName", name,
                            "restaurantId", event.restaurantId().toString()
                    ));
                }));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRestaurantSuspended(RestaurantSuspendedEvent event) {
        safeRun(() -> restaurantSummaryProvider
                .findOwnerUserCredentialIdByRestaurantId(event.restaurantId())
                .ifPresent(ownerId -> notificationService.send(
                        ownerId,
                        NotificationEventType.RESTAURANT_SUSPENDED,
                        Map.of(
                                "reason", event.reason() == null ? "" : event.reason(),
                                "restaurantId", event.restaurantId().toString()
                        )
                )));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPayoutRequested(PayoutRequestedEvent event) {
        safeRun(() -> deliveryPartnerLookup
                .findUserCredentialIdByPartnerId(event.deliveryPartnerId())
                .ifPresent(id -> notificationService.send(
                        id,
                        NotificationEventType.PAYOUT_REQUESTED,
                        Map.of(
                                "amount", event.amount().toPlainString(),
                                "payoutId", event.payoutId().toString()
                        )
                )));
    }

    private void notifyCustomer(UUID orderId, NotificationEventType type, Map<String, String> extra) {
        var order = orderNotificationQuery.findByOrderId(orderId).orElse(null);
        if (order == null) {
            return;
        }
        Map<String, String> params = baseOrderParams(order.orderNumber(), order.orderId());
        params.putAll(extra);
        customerCredential(order.customerId()).ifPresent(id -> notificationService.send(id, type, params));
    }

    private java.util.Optional<UUID> customerCredential(UUID customerId) {
        return customerSummaryProvider.findUserCredentialIdByCustomerId(customerId);
    }

    private static Map<String, String> baseOrderParams(String orderNumber, UUID orderId) {
        Map<String, String> params = new HashMap<>();
        params.put("orderNumber", orderNumber == null ? "" : orderNumber);
        params.put("orderId", orderId.toString());
        return params;
    }

    private static boolean shouldNotifyStatus(OrderStatus to) {
        return to == OrderStatus.PREPARING
                || to == OrderStatus.READY_FOR_PICKUP
                || to == OrderStatus.ASSIGNED
                || to == OrderStatus.PICKED_UP
                || to == OrderStatus.OUT_FOR_DELIVERY;
    }

    private void safeRun(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException ex) {
            log.error("Notification listener failed (swallowed): {}", ex.getMessage(), ex);
        }
    }
}
