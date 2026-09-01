package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record OrderPlacedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId,
        UUID customerId,
        UUID restaurantId
) implements DomainEvent {

    public static OrderPlacedEvent of(UUID orderId, UUID customerId, UUID restaurantId) {
        return new OrderPlacedEvent(UUID.randomUUID(), Instant.now(), orderId, customerId, restaurantId);
    }
}
