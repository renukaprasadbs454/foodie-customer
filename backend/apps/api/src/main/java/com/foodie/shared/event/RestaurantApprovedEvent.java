package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record RestaurantApprovedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID restaurantId,
        UUID approvedByAdminId
) implements DomainEvent {

    public static RestaurantApprovedEvent of(UUID restaurantId, UUID approvedByAdminId) {
        return new RestaurantApprovedEvent(UUID.randomUUID(), Instant.now(), restaurantId, approvedByAdminId);
    }
}
