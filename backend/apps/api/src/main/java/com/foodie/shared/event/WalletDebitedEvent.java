package com.foodie.shared.event;

import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WalletDebitedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID walletAccountId,
        OwnerType ownerType,
        UUID ownerId,
        BigDecimal amount,
        LedgerReferenceType referenceType,
        UUID referenceId,
        UUID ledgerEntryId
) implements DomainEvent {

    public static WalletDebitedEvent of(
            UUID walletAccountId,
            OwnerType ownerType,
            UUID ownerId,
            BigDecimal amount,
            LedgerReferenceType referenceType,
            UUID referenceId,
            UUID ledgerEntryId
    ) {
        return new WalletDebitedEvent(
                UUID.randomUUID(),
                Instant.now(),
                walletAccountId,
                ownerType,
                ownerId,
                amount,
                referenceType,
                referenceId,
                ledgerEntryId
        );
    }
}
