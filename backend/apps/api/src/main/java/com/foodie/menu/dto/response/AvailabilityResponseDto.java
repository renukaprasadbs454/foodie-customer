package com.foodie.menu.dto.response;

import java.util.UUID;

public record AvailabilityResponseDto(
        UUID menuItemId,
        boolean isAvailable
) {
}
