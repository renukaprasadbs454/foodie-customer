package com.foodie.realtime.ws;

import com.foodie.shared.event.DeliveryLocationUpdatedEvent;
import java.util.Map;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class DeliveryLocationBroadcastHandler {

    private final SimpMessagingTemplate messagingTemplate;

    public DeliveryLocationBroadcastHandler(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void onDeliveryLocationUpdated(DeliveryLocationUpdatedEvent event) {
        messagingTemplate.convertAndSend(
                "/topic/order/" + event.orderId(),
                Map.of(
                        "lat", event.latitude(),
                        "lng", event.longitude(),
                        "timestamp", event.occurredAt().toString()
                )
        );
    }
}
