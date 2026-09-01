package com.foodie.restaurant.dto.response;

import java.time.Instant;

public record RestaurantImageUploadResponseDto(
        String fileKey,
        String imageType,
        Instant uploadedAt
) {
}
