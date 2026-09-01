package com.foodie.coupon.repository;

import com.foodie.coupon.entity.CouponRedemption;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouponRedemptionRepository extends JpaRepository<CouponRedemption, UUID> {

    long countByCouponId(UUID couponId);

    long countByCouponIdAndCustomerId(UUID couponId, UUID customerId);

    boolean existsByOrderId(UUID orderId);
}
