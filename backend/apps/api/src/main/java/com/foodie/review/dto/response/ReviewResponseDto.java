package com.foodie.review.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ReviewResponseDto(
        UUID reviewId,
        UUID orderId,
        UUID restaurantId,
        UUID deliveryPartnerId,
        int restaurantRating,
        Integer deliveryRating,
        String comment,
        Instant createdAt
) {
}
