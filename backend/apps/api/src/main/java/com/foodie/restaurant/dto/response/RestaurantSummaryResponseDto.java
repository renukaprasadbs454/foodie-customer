package com.foodie.restaurant.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record RestaurantSummaryResponseDto(
        UUID restaurantId,
        String name,
        List<String> cuisineTypes,
        BigDecimal avgRating,
        BigDecimal latitude,
        BigDecimal longitude,
        String imageUrl
) {
}
