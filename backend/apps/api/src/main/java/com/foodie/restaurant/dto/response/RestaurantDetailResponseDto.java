package com.foodie.restaurant.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record RestaurantDetailResponseDto(
                UUID restaurantId,
                String name,
                String description,
                List<String> cuisineTypes,
                RestaurantAddressResponseDto address,
                BigDecimal latitude,
                BigDecimal longitude,
                String logoImageUrl,
                String coverImageUrl,
                BigDecimal avgRating,
                String status,
                com.foodie.common.enums.RestaurantType restaurantType,
                String rejectionReason,
                BigDecimal commissionPct,
                UUID ownerUserCredentialId) {
        public RestaurantDetailResponseDto(
                        UUID restaurantId,
                        String name,
                        String description,
                        List<String> cuisineTypes,
                        RestaurantAddressResponseDto address,
                        BigDecimal latitude,
                        BigDecimal longitude,
                        String logoImageUrl,
                        String coverImageUrl,
                        BigDecimal avgRating,
                        String status,
                        BigDecimal commissionPct,
                        UUID ownerUserCredentialId) {
                this(
                                restaurantId, name, description, cuisineTypes, address,
                                latitude, longitude, logoImageUrl, coverImageUrl, avgRating,
                                status, com.foodie.common.enums.RestaurantType.BOTH, null, commissionPct,
                                ownerUserCredentialId);
        }
}
