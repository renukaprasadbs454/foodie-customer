package com.foodie.order.dto.response;

import com.foodie.common.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderSummaryResponseDto(
        UUID orderId,
        String orderNumber,
        OrderStatus status,
        UUID restaurantId,
        BigDecimal totalAmount,
        Instant placedAt
) {
}
