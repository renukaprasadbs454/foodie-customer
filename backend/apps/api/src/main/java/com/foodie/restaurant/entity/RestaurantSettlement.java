package com.foodie.restaurant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "restaurant_settlement")
public class RestaurantSettlement {

    @Id
    private UUID id;

    @Column(name = "restaurant_id", nullable = false)
    private UUID restaurantId;

    @Column(name = "settlement_number", nullable = false, unique = true)
    private String settlementNumber;

    @Column(name = "settlement_period_start", nullable = false)
    private Instant settlementPeriodStart;

    @Column(name = "settlement_period_end", nullable = false)
    private Instant settlementPeriodEnd;

    @Column(name = "gross_sales", nullable = false)
    private BigDecimal grossSales;

    @Column(name = "commission_amount", nullable = false)
    private BigDecimal commissionAmount;

    @Column(name = "tax_deducted", nullable = false)
    private BigDecimal taxDeducted;

    @Column(name = "net_payable", nullable = false)
    private BigDecimal netPayable;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "disbursed_at")
    private Instant disbursedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected RestaurantSettlement() {
    }

    public static RestaurantSettlement create(
            UUID restaurantId,
            String settlementNumber,
            Instant periodStart,
            Instant periodEnd,
            BigDecimal grossSales,
            BigDecimal commissionAmount,
            BigDecimal taxDeducted,
            BigDecimal netPayable) {
        RestaurantSettlement s = new RestaurantSettlement();
        s.id = UUID.randomUUID();
        s.restaurantId = restaurantId;
        s.settlementNumber = settlementNumber;
        s.settlementPeriodStart = periodStart;
        s.settlementPeriodEnd = periodEnd;
        s.grossSales = grossSales;
        s.commissionAmount = commissionAmount;
        s.taxDeducted = taxDeducted;
        s.netPayable = netPayable;
        s.status = "PENDING";
        Instant now = Instant.now();
        s.createdAt = now;
        s.updatedAt = now;
        return s;
    }

    public void approve() {
        this.status = "APPROVED";
        this.updatedAt = Instant.now();
    }

    public void disburse(String paymentReference) {
        this.status = "DISBURSED";
        this.paymentReference = paymentReference;
        Instant now = Instant.now();
        this.disbursedAt = now;
        this.updatedAt = now;
    }

    // Getters
    public UUID getId() {
        return id;
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }

    public String getSettlementNumber() {
        return settlementNumber;
    }

    public Instant getSettlementPeriodStart() {
        return settlementPeriodStart;
    }

    public Instant getSettlementPeriodEnd() {
        return settlementPeriodEnd;
    }

    public BigDecimal getGrossSales() {
        return grossSales;
    }

    public BigDecimal getCommissionAmount() {
        return commissionAmount;
    }

    public BigDecimal getTaxDeducted() {
        return taxDeducted;
    }

    public BigDecimal getNetPayable() {
        return netPayable;
    }

    public String getStatus() {
        return status;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public Instant getDisbursedAt() {
        return disbursedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
