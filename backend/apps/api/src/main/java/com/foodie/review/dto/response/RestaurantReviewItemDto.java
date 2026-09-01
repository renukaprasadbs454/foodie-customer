package com.foodie.review.dto.response;

import java.time.Instant;

/** Public list item — no customer identity (API Contracts MODULE 12.2). */
public record RestaurantReviewItemDto(
        int restaurantRating,
        Integer deliveryRating,
        String comment,
        Instant createdAt
) {
}
