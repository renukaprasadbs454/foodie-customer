package com.foodie.realtime.ws;

import com.foodie.shared.event.NotificationDispatchedEvent;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * WebSocket fan-out for in-app notification center (Phase3 §7).
 * Topic: /topic/user/{userCredentialId}/notifications
 */
@Component
public class NotificationBroadcastHandler {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationBroadcastHandler(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void onNotificationDispatched(NotificationDispatchedEvent event) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "NOTIFICATION");
        payload.put("notificationLogId", event.notificationLogId().toString());
        payload.put("title", event.title());
        payload.put("body", event.body());
        payload.put("sentAt", event.sentAt().toString());
        messagingTemplate.convertAndSend(
                "/topic/user/" + event.userCredentialId() + "/notifications",
                payload
        );
    }
}
