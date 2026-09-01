package com.foodie.analytics.dto.response;

import java.math.BigDecimal;

public record DashboardSummaryResponseDto(
        long totalOrders,
        BigDecimal totalRevenue,
        long activeRestaurants,
        long activeDeliveryPartners,
        long newCustomers,
        BigDecimal avgOrderValue
) {
}
