package com.foodie.restaurant.dto.response;

import java.time.Instant;
import java.util.UUID;

public record RestaurantDocumentResponseDto(
        UUID documentId,
        String docType,
        Instant verifiedAt
) {
}
