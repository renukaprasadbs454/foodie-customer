package com.foodie.cart.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record CartItemResponseDto(
                UUID cartItemId,
                UUID menuItemId,
                String name,
                UUID variantId,
                int quantity,
                String notes,
                BigDecimal unitPrice,
                BigDecimal lineTotal) {
}
