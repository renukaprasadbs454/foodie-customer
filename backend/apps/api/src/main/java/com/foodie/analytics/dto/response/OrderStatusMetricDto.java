package com.foodie.analytics.dto.response;

import java.math.BigDecimal;

public record OrderStatusMetricDto(
        String status,
        long count,
        BigDecimal percentageOfTotal
) {
}
