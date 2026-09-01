package com.foodie.order.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponseDto(
        UUID menuItemId,
        UUID variantId,
        String name,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {
}
