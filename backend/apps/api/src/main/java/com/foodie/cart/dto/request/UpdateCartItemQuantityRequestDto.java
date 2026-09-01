package com.foodie.cart.dto.request;

import jakarta.validation.constraints.Min;

public record UpdateCartItemQuantityRequestDto(
        @Min(value = 0, message = "Quantity cannot be negative")
        int quantity
) {
}
