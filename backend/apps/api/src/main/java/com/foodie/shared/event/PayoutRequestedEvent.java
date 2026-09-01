package com.foodie.shared.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PayoutRequestedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID payoutId,
        UUID walletAccountId,
        UUID deliveryPartnerId,
        BigDecimal amount
) implements DomainEvent {

    public static PayoutRequestedEvent of(
            UUID payoutId,
            UUID walletAccountId,
            UUID deliveryPartnerId,
            BigDecimal amount
    ) {
        return new PayoutRequestedEvent(
                UUID.randomUUID(), Instant.now(), payoutId, walletAccountId, deliveryPartnerId, amount);
    }
}
