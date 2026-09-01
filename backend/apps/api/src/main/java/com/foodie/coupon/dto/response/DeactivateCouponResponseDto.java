package com.foodie.coupon.dto.response;

import java.util.UUID;

public record DeactivateCouponResponseDto(
        UUID couponId,
        boolean isActive
) {
}
