package com.foodie.menu.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCategoryRequestDto(
        @NotBlank
        @Size(min = 1, max = 100)
        String name,

        Integer displayOrder
) {
    public int displayOrderOrDefault() {
        return displayOrder != null ? displayOrder : 0;
    }
}
