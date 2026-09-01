package com.foodie.delivery.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record DeliveryPricingConfigResponseDto(
        BigDecimal minPricePerDelivery,
        BigDecimal moneyPerKm,
        Instant updatedAt,
        UUID updatedBy
) {
}
