package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record RestaurantSuspendedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID restaurantId,
        UUID suspendedByAdminId,
        String reason
) implements DomainEvent {

    public static RestaurantSuspendedEvent of(UUID restaurantId, UUID suspendedByAdminId, String reason) {
        return new RestaurantSuspendedEvent(
                UUID.randomUUID(), Instant.now(), restaurantId, suspendedByAdminId, reason);
    }
}
