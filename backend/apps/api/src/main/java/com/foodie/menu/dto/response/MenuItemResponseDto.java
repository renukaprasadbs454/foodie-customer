package com.foodie.menu.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record MenuItemResponseDto(
        UUID menuItemId,
        UUID categoryId,
        String name,
        String description,
        BigDecimal basePrice,
        boolean isVeg,
        String foodType,
        boolean isAvailable,
        String imageUrl
) {
    public MenuItemResponseDto(
            UUID menuItemId,
            UUID categoryId,
            String name,
            String description,
            BigDecimal basePrice,
            boolean isVeg,
            boolean isAvailable,
            String imageUrl
    ) {
        this(
                menuItemId,
                categoryId,
                name,
                description,
                basePrice,
                isVeg,
                isVeg ? "VEG" : "NON_VEG",
                isAvailable,
                imageUrl
        );
    }
}
