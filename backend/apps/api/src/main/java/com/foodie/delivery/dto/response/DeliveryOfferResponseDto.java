package com.foodie.delivery.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record DeliveryOfferResponseDto(
        UUID assignmentId,
        UUID orderId,
        String restaurantName,
        String pickupAddress,
        Double estimatedDistance,
        BigDecimal estimatedFee
) {
}
