package com.foodie.notification;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.common.enums.NotificationEventType;
import com.foodie.common.enums.OrderStatus;
import com.foodie.notification.listener.DomainNotificationListeners;
import com.foodie.notification.service.NotificationService;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import com.foodie.shared.contract.OrderNotificationQuery;
import com.foodie.shared.contract.PaymentOrderLookup;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import com.foodie.shared.event.OrderPlacedEvent;
import com.foodie.shared.event.OrderStatusChangedEvent;
import com.foodie.shared.event.PaymentFailedEvent;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DomainNotificationListenersTest {

    @Mock private NotificationService notificationService;
    @Mock private OrderNotificationQuery orderNotificationQuery;
    @Mock private CustomerSummaryProvider customerSummaryProvider;
    @Mock private RestaurantSummaryProvider restaurantSummaryProvider;
    @Mock private DeliveryPartnerLookup deliveryPartnerLookup;
    @Mock private PaymentOrderLookup paymentOrderLookup;

    private DomainNotificationListeners listeners;

    @BeforeEach
    void setUp() {
        listeners = new DomainNotificationListeners(
                notificationService,
                orderNotificationQuery,
                customerSummaryProvider,
                restaurantSummaryProvider,
                deliveryPartnerLookup,
                paymentOrderLookup
        );
    }

    @Test
    void onOrderPlaced_notifiesRestaurantOwner() {
        UUID orderId = UUID.randomUUID();
        UUID restaurantId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        when(orderNotificationQuery.findByOrderId(orderId)).thenReturn(Optional.of(
                new OrderNotificationQuery.OrderNotifySnapshot(
                        orderId, "FD-9", customerId, restaurantId, null, OrderStatus.PLACED)));
        when(restaurantSummaryProvider.findOwnerUserCredentialIdByRestaurantId(restaurantId))
                .thenReturn(Optional.of(ownerId));

        listeners.onOrderPlaced(OrderPlacedEvent.of(orderId, customerId, restaurantId));

        verify(notificationService).send(
                eq(ownerId), eq(NotificationEventType.ORDER_PLACED), any(Map.class));
    }

    @Test
    void onOrderStatusChanged_skipsPlaced() {
        listeners.onOrderStatusChanged(OrderStatusChangedEvent.of(
                UUID.randomUUID(), OrderStatus.PLACED, OrderStatus.CONFIRMED));

        verify(notificationService, never()).send(any(), any(), any());
    }

    @Test
    void onPaymentFailed_notifiesCustomer() {
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID credentialId = UUID.randomUUID();
        when(orderNotificationQuery.findByOrderId(orderId)).thenReturn(Optional.of(
                new OrderNotificationQuery.OrderNotifySnapshot(
                        orderId, "FD-1", customerId, UUID.randomUUID(), null, OrderStatus.PLACED)));
        when(customerSummaryProvider.findUserCredentialIdByCustomerId(customerId))
                .thenReturn(Optional.of(credentialId));

        listeners.onPaymentFailed(PaymentFailedEvent.of(orderId, UUID.randomUUID()));

        verify(notificationService).send(
                eq(credentialId), eq(NotificationEventType.PAYMENT_FAILED), any(Map.class));
    }
}
