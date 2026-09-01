package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Coupon public interface (Phase3 §2.12).
 * Order calls {@link #apply} at checkout; redemption is finalized on {@code OrderConfirmedEvent}.
 */
public interface CouponService {

    List<CouponView> listEligible(UUID customerId, UUID restaurantId, BigDecimal cartTotal);

    DiscountResult apply(String code, UUID customerId, UUID restaurantId, BigDecimal cartTotal);

    void recordRedemption(UUID couponId, UUID customerId, UUID orderId);

    record CouponView(
            String code,
            String discountType,
            BigDecimal value,
            BigDecimal minOrderAmount,
            BigDecimal maxDiscountAmount,
            Instant expiryDate
    ) {
    }

    /**
     * {@code couponId} is for Order persistence; HTTP apply response exposes code/amounts only.
     */
    record DiscountResult(
            UUID couponId,
            String code,
            BigDecimal discountAmount,
            BigDecimal finalTotal
    ) {
    }
}
