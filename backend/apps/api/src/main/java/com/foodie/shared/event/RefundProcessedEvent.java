package com.foodie.shared.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RefundProcessedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID paymentId,
        UUID refundRequestId,
        BigDecimal amount
) implements DomainEvent {

    public static RefundProcessedEvent of(UUID paymentId, UUID refundRequestId, BigDecimal amount) {
        return new RefundProcessedEvent(
                UUID.randomUUID(), Instant.now(), paymentId, refundRequestId, amount);
    }
}
