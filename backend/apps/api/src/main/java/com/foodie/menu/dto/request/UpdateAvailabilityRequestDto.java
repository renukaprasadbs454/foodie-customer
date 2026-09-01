package com.foodie.menu.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateAvailabilityRequestDto(
        @NotNull
        Boolean isAvailable
) {
}
