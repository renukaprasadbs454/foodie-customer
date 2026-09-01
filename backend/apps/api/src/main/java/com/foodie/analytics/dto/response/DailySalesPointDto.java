package com.foodie.analytics.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailySalesPointDto(
        LocalDate date,
        long orderCount,
        BigDecimal revenue
) {
}
