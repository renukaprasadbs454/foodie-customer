package com.foodie.wallet.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.OwnerType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Entity
@Table(name = "wallet_account")
public class WalletAccount extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type", nullable = false, length = 20, updatable = false)
    private OwnerType ownerType;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(name = "balance", nullable = false, precision = 10, scale = 2)
    private BigDecimal balance;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected WalletAccount() {
    }

    public static WalletAccount open(OwnerType ownerType, UUID ownerId) {
        WalletAccount account = new WalletAccount();
        account.ownerType = ownerType;
        account.ownerId = ownerId;
        account.balance = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        return account;
    }

    /** Cache update only — ledger_entry remains the source of truth. */
    public void applyCredit(BigDecimal amount) {
        this.balance = this.balance.add(amount).setScale(2, RoundingMode.HALF_UP);
    }

    /** Cache update only — ledger_entry remains the source of truth. */
    public void applyDebit(BigDecimal amount) {
        this.balance = this.balance.subtract(amount).setScale(2, RoundingMode.HALF_UP);
    }

    public OwnerType getOwnerType() {
        return ownerType;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public Long getVersion() {
        return version;
    }
}
