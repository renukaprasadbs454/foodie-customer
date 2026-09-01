package com.foodie.coupon.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "coupon_redemption")
public class CouponRedemption extends BaseEntity {

    @Column(name = "coupon_id", nullable = false, updatable = false)
    private UUID couponId;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private UUID customerId;

    @Column(name = "order_id", nullable = false, updatable = false)
    private UUID orderId;

    @Column(name = "redeemed_at", nullable = false, updatable = false)
    private Instant redeemedAt;

    protected CouponRedemption() {
    }

    public static CouponRedemption record(UUID couponId, UUID customerId, UUID orderId) {
        CouponRedemption redemption = new CouponRedemption();
        redemption.couponId = couponId;
        redemption.customerId = customerId;
        redemption.orderId = orderId;
        redemption.redeemedAt = Instant.now();
        return redemption;
    }

    public UUID getCouponId() {
        return couponId;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public Instant getRedeemedAt() {
        return redeemedAt;
    }
}
