package com.foodie.coupon.service;

import com.foodie.coupon.dto.request.CreateCouponRequestDto;
import com.foodie.coupon.dto.response.CouponResponseDto;
import com.foodie.coupon.dto.response.DeactivateCouponResponseDto;
import java.util.UUID;

/**
 * Admin-facing coupon mutations (API Contracts MODULE 13.4 / 13.5).
 * Audit_log writes are owned by the Admin module and deferred until that module lands.
 */
public interface CouponAdminService {

    CouponResponseDto create(CreateCouponRequestDto request);

    DeactivateCouponResponseDto deactivate(UUID couponId);
}
