package com.foodie.delivery.service;

import com.foodie.delivery.dto.request.UpdateDeliveryPricingRequestDto;
import com.foodie.delivery.dto.response.DeliveryPricingConfigResponseDto;
import java.math.BigDecimal;
import java.util.UUID;

public interface DeliveryPricingService {
    DeliveryPricingConfigResponseDto getPricingConfig();
    DeliveryPricingConfigResponseDto updatePricingConfig(UUID adminId, UpdateDeliveryPricingRequestDto request);
    BigDecimal calculateDeliveryFee(Double distanceKm);
}
