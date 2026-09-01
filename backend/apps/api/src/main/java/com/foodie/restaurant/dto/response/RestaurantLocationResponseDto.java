package com.foodie.restaurant.dto.response;

import java.math.BigDecimal;

public record RestaurantLocationResponseDto(
        BigDecimal latitude,
        BigDecimal longitude,
        String addressLine1,
        String addressLine2,
        String landmark,
        String city,
        String state,
        String country,
        String pincode,
        String formattedAddress
) {
}
