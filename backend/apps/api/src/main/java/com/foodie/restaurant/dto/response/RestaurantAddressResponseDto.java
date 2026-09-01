package com.foodie.restaurant.dto.response;

import java.math.BigDecimal;

public record RestaurantAddressResponseDto(
        String line1,
        String line2,
        String landmark,
        String city,
        String state,
        String country,
        String pincode,
        String formattedAddress,
        BigDecimal latitude,
        BigDecimal longitude
) {
    public RestaurantAddressResponseDto(
            String line1,
            String line2,
            String city,
            String pincode,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        this(line1, line2, null, city, null, "India", pincode, null, latitude, longitude);
    }
}
