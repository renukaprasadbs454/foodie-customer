package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Emitted after a notification_log row is persisted so realtime can fan-out to
 * /topic/user/{userCredentialId}/notifications without Notification calling STOMP directly.
 */
public record NotificationDispatchedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID userCredentialId,
        UUID notificationLogId,
        String title,
        String body,
        Instant sentAt
) implements DomainEvent {

    public static NotificationDispatchedEvent of(
            UUID userCredentialId,
            UUID notificationLogId,
            String title,
            String body,
            Instant sentAt
    ) {
        return new NotificationDispatchedEvent(
                UUID.randomUUID(),
                Instant.now(),
                userCredentialId,
                notificationLogId,
                title,
                body,
                sentAt
        );
    }
}
