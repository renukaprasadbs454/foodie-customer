package com.foodie.coupon.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "coupon")
@SQLRestriction("\"deleted_at\" IS NULL")
public class Coupon extends BaseEntity {

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 10)
    private DiscountType discountType;

    @Column(name = "value", nullable = false, precision = 10, scale = 2)
    private BigDecimal value;

    @Column(name = "min_order_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal minOrderAmount;

    @Column(name = "max_discount_amount", precision = 10, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "expiry_date", nullable = false)
    private Instant expiryDate;

    @Column(name = "usage_limit_total")
    private Integer usageLimitTotal;

    @Column(name = "usage_limit_per_user", nullable = false)
    private int usageLimitPerUser;

    @Column(name = "restaurant_id")
    private UUID restaurantId;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Coupon() {
    }

    public static Coupon create(
            String code,
            DiscountType discountType,
            BigDecimal value,
            BigDecimal minOrderAmount,
            BigDecimal maxDiscountAmount,
            Instant expiryDate,
            Integer usageLimitTotal,
            int usageLimitPerUser,
            UUID restaurantId) {
        Coupon coupon = new Coupon();
        coupon.code = code;
        coupon.discountType = discountType;
        coupon.value = value;
        coupon.minOrderAmount = minOrderAmount;
        coupon.maxDiscountAmount = maxDiscountAmount;
        coupon.expiryDate = expiryDate;
        coupon.usageLimitTotal = usageLimitTotal;
        coupon.usageLimitPerUser = usageLimitPerUser;
        coupon.restaurantId = restaurantId;
        coupon.active = true;
        return coupon;
    }

    public void deactivate() {
        this.active = false;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
        this.active = false;
    }

    public boolean isExpired(Instant now) {
        return !now.isBefore(expiryDate);
    }

    public String getCode() {
        return code;
    }

    public DiscountType getDiscountType() {
        return discountType;
    }

    public BigDecimal getValue() {
        return value;
    }

    public BigDecimal getMinOrderAmount() {
        return minOrderAmount;
    }

    public BigDecimal getMaxDiscountAmount() {
        return maxDiscountAmount;
    }

    public Instant getExpiryDate() {
        return expiryDate;
    }

    public Integer getUsageLimitTotal() {
        return usageLimitTotal;
    }

    public int getUsageLimitPerUser() {
        return usageLimitPerUser;
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }

    public boolean isActive() {
        return active;
    }

    public Long getVersion() {
        return version;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }
}
