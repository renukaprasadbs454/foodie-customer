package com.foodie.restaurant.dto.response;

import java.math.BigDecimal;

public record RestaurantEarningsSummaryDto(
        BigDecimal grossEarnings,
        BigDecimal netSettled,
        BigDecimal pendingPayout,
        int totalOrders,
        int totalSettlements) {
}
