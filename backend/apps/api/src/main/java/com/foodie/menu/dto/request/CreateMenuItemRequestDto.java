package com.foodie.menu.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateMenuItemRequestDto(
        @NotNull
        UUID categoryId,

        @NotBlank
        @Size(min = 2, max = 255)
        String name,

        @Size(max = 2000)
        String description,

        @NotNull
        @DecimalMin(value = "0.01", inclusive = true)
        @Digits(integer = 8, fraction = 2)
        BigDecimal basePrice,

        Boolean isVeg,

        @Pattern(regexp = "^(VEG|NON_VEG)$", message = "foodType must be VEG or NON_VEG")
        String foodType
) {
    public CreateMenuItemRequestDto(
            UUID categoryId,
            String name,
            String description,
            BigDecimal basePrice,
            Boolean isVeg
    ) {
        this(categoryId, name, description, basePrice, isVeg, isVeg != null ? (isVeg ? "VEG" : "NON_VEG") : null);
    }

    public boolean resolveIsVeg() {
        if (foodType != null) {
            return "VEG".equalsIgnoreCase(foodType);
        }
        return Boolean.TRUE.equals(isVeg);
    }

    public String resolveFoodType() {
        if (foodType != null) {
            return foodType.toUpperCase();
        }
        return Boolean.TRUE.equals(isVeg) ? "VEG" : "NON_VEG";
    }
}
