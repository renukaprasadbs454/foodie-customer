package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record OrderCancelledEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId,
        String reason
) implements DomainEvent {

    public static OrderCancelledEvent of(UUID orderId, String reason) {
        return new OrderCancelledEvent(UUID.randomUUID(), Instant.now(), orderId, reason);
    }
}
