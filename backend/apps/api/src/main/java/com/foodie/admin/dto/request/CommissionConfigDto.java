package com.foodie.admin.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CommissionConfigDto(
        @NotNull(message = "Restaurant commission rate is required")
        @DecimalMin(value = "0.0", message = "Commission rate cannot be negative")
        @DecimalMax(value = "100.0", message = "Commission rate cannot exceed 100%")
        BigDecimal restaurantCommissionRate,

        @NotNull(message = "Delivery partner commission rate is required")
        @DecimalMin(value = "0.0", message = "Commission rate cannot be negative")
        @DecimalMax(value = "100.0", message = "Commission rate cannot exceed 100%")
        BigDecimal deliveryCommissionRate,

        @NotNull(message = "Platform fixed fee is required")
        @DecimalMin(value = "0.0", message = "Platform fee cannot be negative")
        BigDecimal platformFixedFee
) {
}
