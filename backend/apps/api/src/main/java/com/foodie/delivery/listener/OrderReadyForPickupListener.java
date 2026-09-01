package com.foodie.delivery.listener;

import com.foodie.common.enums.OrderStatus;
import com.foodie.delivery.service.DeliveryService;
import com.foodie.shared.event.OrderStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OrderReadyForPickupListener {

    private static final Logger log = LoggerFactory.getLogger(OrderReadyForPickupListener.class);

    private final DeliveryService deliveryService;

    public OrderReadyForPickupListener(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @EventListener
    @Transactional
    public void onOrderStatusChanged(OrderStatusChangedEvent event) {
        if (event.toStatus() != OrderStatus.READY_FOR_PICKUP) {
            return;
        }
        log.info("Order {} ready for pickup — creating delivery assignment", event.orderId());
        deliveryService.createAssignmentForOrder(event.orderId());
    }
}
