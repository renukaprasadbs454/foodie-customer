package com.foodie.restaurant.dto.response;

import com.foodie.common.enums.RestaurantBusinessType;
import java.time.Instant;
import java.util.UUID;

public record RestaurantLegalDetailResponseDto(
        UUID id,
        UUID restaurantId,
        String gstin,
        String pan,
        String fssaiLicenseNumber,
        String legalName,
        RestaurantBusinessType businessType,
        String contactEmail,
        String contactPhone,
        Instant createdAt,
        Instant updatedAt
) {}
