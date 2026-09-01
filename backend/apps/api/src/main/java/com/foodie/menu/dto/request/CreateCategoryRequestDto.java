package com.foodie.menu.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequestDto(
        @NotBlank
        @Size(min = 1, max = 100)
        String name,

        Integer displayOrder
) {
    public int displayOrderOrDefault() {
        return displayOrder == null ? 0 : displayOrder;
    }
}
