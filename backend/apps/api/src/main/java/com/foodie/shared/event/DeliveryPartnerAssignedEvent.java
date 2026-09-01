package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record DeliveryPartnerAssignedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId,
        UUID deliveryPartnerId,
        UUID assignmentId
) implements DomainEvent {

    public static DeliveryPartnerAssignedEvent of(UUID orderId, UUID deliveryPartnerId, UUID assignmentId) {
        return new DeliveryPartnerAssignedEvent(
                UUID.randomUUID(), Instant.now(), orderId, deliveryPartnerId, assignmentId);
    }
}
