package com.foodie.coupon.dto.response;

import java.math.BigDecimal;

public record ApplyCouponResponseDto(
        String code,
        BigDecimal discountAmount,
        BigDecimal finalTotal
) {
}
