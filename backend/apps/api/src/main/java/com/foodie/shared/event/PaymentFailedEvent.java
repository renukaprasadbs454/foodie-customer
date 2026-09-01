package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record PaymentFailedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId,
        UUID paymentId
) implements DomainEvent {

    public static PaymentFailedEvent of(UUID orderId, UUID paymentId) {
        return new PaymentFailedEvent(UUID.randomUUID(), Instant.now(), orderId, paymentId);
    }
}
