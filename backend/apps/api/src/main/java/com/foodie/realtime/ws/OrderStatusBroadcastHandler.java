package com.foodie.realtime.ws;

import com.foodie.shared.event.OrderStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class OrderStatusBroadcastHandler {

    private static final Logger log = LoggerFactory.getLogger(OrderStatusBroadcastHandler.class);
    private final SimpMessagingTemplate messagingTemplate;

    public OrderStatusBroadcastHandler(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void onOrderStatusChanged(OrderStatusChangedEvent event) {
        String destination = "/topic/order/" + event.orderId();
        log.debug("Broadcasting order status change {} to {}", event.toStatus(), destination);

        Map<String, Object> payload = Map.of(
                "type", "ORDER_STATUS_CHANGED",
                "orderId", event.orderId().toString(),
                "status", event.toStatus().name(),
                "timestamp", event.occurredAt().toString());

        messagingTemplate.convertAndSend(destination, payload);
    }
}
