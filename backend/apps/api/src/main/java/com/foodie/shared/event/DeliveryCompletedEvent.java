package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record DeliveryCompletedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId,
        UUID deliveryPartnerId,
        UUID assignmentId
) implements DomainEvent {

    public static DeliveryCompletedEvent of(UUID orderId, UUID deliveryPartnerId, UUID assignmentId) {
        return new DeliveryCompletedEvent(
                UUID.randomUUID(), Instant.now(), orderId, deliveryPartnerId, assignmentId);
    }
}
