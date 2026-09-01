package com.foodie.coupon.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record ApplyCouponRequestDto(
        @NotBlank @Size(max = 30) String code,
        @NotNull UUID restaurantId,
        @NotNull @DecimalMin(value = "0.01", inclusive = true) BigDecimal cartTotal
) {
}
