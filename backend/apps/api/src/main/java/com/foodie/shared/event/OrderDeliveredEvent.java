package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record OrderDeliveredEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId
) implements DomainEvent {

    public static OrderDeliveredEvent of(UUID orderId) {
        return new OrderDeliveredEvent(UUID.randomUUID(), Instant.now(), orderId);
    }
}
