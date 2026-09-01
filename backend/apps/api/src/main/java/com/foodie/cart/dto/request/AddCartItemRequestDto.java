package com.foodie.cart.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record AddCartItemRequestDto(
        @NotNull
        UUID menuItemId,

        UUID variantId,

        @NotNull
        @Min(1)
        @Max(20)
        Integer quantity,

        @Size(max = 500)
        String notes
) {
}
