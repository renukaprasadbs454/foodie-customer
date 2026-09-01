package com.foodie.menu.dto.request;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateVariantRequestDto(
        @NotBlank
        @Size(min = 1, max = 100)
        String name,

        @NotNull
        @Digits(integer = 8, fraction = 2)
        BigDecimal priceDelta
) {
}
