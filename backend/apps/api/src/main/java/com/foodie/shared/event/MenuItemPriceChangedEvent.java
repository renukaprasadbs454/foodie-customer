package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Cache invalidation signal for menu:{restaurantId} (Phase3 §6 / API Contracts §4).
 */
public record MenuItemPriceChangedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID restaurantId,
        UUID menuItemId
) implements DomainEvent {

    public static MenuItemPriceChangedEvent of(UUID restaurantId, UUID menuItemId) {
        return new MenuItemPriceChangedEvent(UUID.randomUUID(), Instant.now(), restaurantId, menuItemId);
    }
}
