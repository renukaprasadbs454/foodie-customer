package com.foodie.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SuspendRestaurantRequestDto(
        @NotBlank @Size(max = 500) String reason
) {
}
