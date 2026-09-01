package com.foodie.order.dto.response;

import com.foodie.common.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponseDto(
        UUID orderId,
        String orderNumber,
        OrderStatus status,
        UUID customerId,
        UUID restaurantId,
        UUID addressId,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        Instant placedAt,
        List<OrderItemResponseDto> items,
        List<OrderStatusEventResponseDto> orderStatusEvents
) {
}
