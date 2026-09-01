package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

/** Sanitized live location for /topic/order/{orderId} (Phase3 §7 / §10.8). */
public record DeliveryLocationUpdatedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId,
        double latitude,
        double longitude
) implements DomainEvent {

    public static DeliveryLocationUpdatedEvent of(UUID orderId, double latitude, double longitude) {
        return new DeliveryLocationUpdatedEvent(
                UUID.randomUUID(), Instant.now(), orderId, latitude, longitude);
    }
}
