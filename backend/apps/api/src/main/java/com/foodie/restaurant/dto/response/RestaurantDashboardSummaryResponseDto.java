package com.foodie.restaurant.dto.response;

import java.math.BigDecimal;

public record RestaurantDashboardSummaryResponseDto(
        long totalOrders,
        long completedOrders,
        long cancelledOrders,
        long pendingOrders,
        BigDecimal grossSales,
        BigDecimal commissionDeducted,
        BigDecimal netEarnings,
        BigDecimal avgOrderValue,
        BigDecimal avgRating,
        long activeMenuItemsCount
) {}
