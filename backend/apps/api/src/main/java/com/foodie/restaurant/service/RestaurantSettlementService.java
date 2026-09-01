package com.foodie.restaurant.service;

import com.foodie.restaurant.dto.response.RestaurantEarningsSummaryDto;
import com.foodie.restaurant.dto.response.RestaurantSettlementResponseDto;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface RestaurantSettlementService {

    List<RestaurantSettlementResponseDto> getSettlementsForRestaurant(UUID ownerUserCredentialId);

    RestaurantEarningsSummaryDto getEarningsSummaryForRestaurant(UUID ownerUserCredentialId);

    RestaurantSettlementResponseDto generateSettlement(UUID restaurantId, Instant periodStart, Instant periodEnd);

    RestaurantSettlementResponseDto disburseSettlement(UUID settlementId, String paymentReference);

    List<RestaurantSettlementResponseDto> getAllSettlementsForAdmin(UUID restaurantId, String status);
}
