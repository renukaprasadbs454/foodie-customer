package com.foodie.wallet.entity;

import com.foodie.common.enums.LedgerEntryType;
import com.foodie.common.enums.LedgerReferenceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Append-only financial truth. Never updated, never deleted, never soft-deleted.
 * Does not extend BaseEntity (no updated_at column per Phase3 §3.6).
 */
@Entity
@Table(name = "ledger_entry")
public class LedgerEntry {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "wallet_account_id", nullable = false, updatable = false)
    private UUID walletAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 10, updatable = false)
    private LedgerEntryType entryType;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2, updatable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", nullable = false, length = 30, updatable = false)
    private LedgerReferenceType referenceType;

    @Column(name = "reference_id", nullable = false, updatable = false)
    private UUID referenceId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LedgerEntry() {
    }

    public static LedgerEntry credit(
            UUID walletAccountId,
            BigDecimal amount,
            LedgerReferenceType referenceType,
            UUID referenceId
    ) {
        return create(walletAccountId, LedgerEntryType.CREDIT, amount, referenceType, referenceId);
    }

    public static LedgerEntry debit(
            UUID walletAccountId,
            BigDecimal amount,
            LedgerReferenceType referenceType,
            UUID referenceId
    ) {
        return create(walletAccountId, LedgerEntryType.DEBIT, amount, referenceType, referenceId);
    }

    private static LedgerEntry create(
            UUID walletAccountId,
            LedgerEntryType entryType,
            BigDecimal amount,
            LedgerReferenceType referenceType,
            UUID referenceId
    ) {
        LedgerEntry entry = new LedgerEntry();
        entry.walletAccountId = walletAccountId;
        entry.entryType = entryType;
        entry.amount = amount.setScale(2, RoundingMode.HALF_UP);
        entry.referenceType = referenceType;
        entry.referenceId = referenceId;
        return entry;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getWalletAccountId() {
        return walletAccountId;
    }

    public LedgerEntryType getEntryType() {
        return entryType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public LedgerReferenceType getReferenceType() {
        return referenceType;
    }

    public UUID getReferenceId() {
        return referenceId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
