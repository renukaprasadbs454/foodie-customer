package com.foodie.delivery.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record UpdateDeliveryPricingRequestDto(
        @NotNull(message = "minPricePerDelivery is required")
        @DecimalMin(value = "0.0", message = "minPricePerDelivery must be non-negative")
        BigDecimal minPricePerDelivery,

        @NotNull(message = "moneyPerKm is required")
        @DecimalMin(value = "0.0", message = "moneyPerKm must be non-negative")
        BigDecimal moneyPerKm
) {
}
