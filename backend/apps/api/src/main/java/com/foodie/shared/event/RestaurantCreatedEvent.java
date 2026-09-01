package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record RestaurantCreatedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID restaurantId,
        UUID ownerUserCredentialId,
        String name
) implements DomainEvent {

    public static RestaurantCreatedEvent of(UUID restaurantId, UUID ownerUserCredentialId, String name) {
        return new RestaurantCreatedEvent(UUID.randomUUID(), Instant.now(), restaurantId, ownerUserCredentialId, name);
    }
}
