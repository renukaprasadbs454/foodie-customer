package com.foodie.restaurant.dto.response;

import java.time.Instant;

public record RestaurantUpiResponseDto(
        String upiId,
        String upiName,
        boolean isVerified,
        Instant verifiedAt
) {}
