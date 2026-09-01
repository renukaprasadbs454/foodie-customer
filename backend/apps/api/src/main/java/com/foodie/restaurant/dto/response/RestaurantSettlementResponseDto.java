package com.foodie.restaurant.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RestaurantSettlementResponseDto(
        UUID id,
        UUID restaurantId,
        String settlementNumber,
        Instant settlementPeriodStart,
        Instant settlementPeriodEnd,
        BigDecimal grossSales,
        BigDecimal commissionAmount,
        BigDecimal taxDeducted,
        BigDecimal netPayable,
        String status,
        String paymentReference,
        Instant disbursedAt,
        Instant createdAt) {
}
