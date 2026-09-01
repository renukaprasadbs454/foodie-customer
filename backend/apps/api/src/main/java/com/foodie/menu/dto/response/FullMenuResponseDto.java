package com.foodie.menu.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record FullMenuResponseDto(
        UUID restaurantId,
        List<MenuCategoryDto> categories
) {
    public record MenuCategoryDto(
            UUID categoryId,
            String name,
            int displayOrder,
            List<MenuItemDto> items
    ) {
    }

    public record MenuItemDto(
            UUID menuItemId,
            String name,
            String description,
            BigDecimal basePrice,
            boolean isVeg,
            String foodType,
            boolean isAvailable,
            String imageUrl,
            List<VariantResponseDto> variants
    ) {
        public MenuItemDto(
                UUID menuItemId,
                String name,
                String description,
                BigDecimal basePrice,
                boolean isVeg,
                boolean isAvailable,
                String imageUrl,
                List<VariantResponseDto> variants
        ) {
            this(
                    menuItemId,
                    name,
                    description,
                    basePrice,
                    isVeg,
                    isVeg ? "VEG" : "NON_VEG",
                    isAvailable,
                    imageUrl,
                    variants
            );
        }
    }
}
