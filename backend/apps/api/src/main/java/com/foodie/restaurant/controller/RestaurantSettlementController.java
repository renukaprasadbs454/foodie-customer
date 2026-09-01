package com.foodie.restaurant.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.restaurant.dto.response.RestaurantEarningsSummaryDto;
import com.foodie.restaurant.dto.response.RestaurantSettlementResponseDto;
import com.foodie.restaurant.service.RestaurantSettlementService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/restaurants/me")
@Tag(name = "Restaurant — Financial Settlements")
public class RestaurantSettlementController {

    private final RestaurantSettlementService settlementService;

    public RestaurantSettlementController(RestaurantSettlementService settlementService) {
        this.settlementService = settlementService;
    }

    @GetMapping("/settlements")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "List settlement history for my restaurant")
    public ResponseEntity<ApiResponse<List<RestaurantSettlementResponseDto>>> getSettlements(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                settlementService.getSettlementsForRestaurant(principal.userId())));
    }

    @GetMapping("/earnings")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Get earnings summary for my restaurant")
    public ResponseEntity<ApiResponse<RestaurantEarningsSummaryDto>> getEarnings(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                settlementService.getEarningsSummaryForRestaurant(principal.userId())));
    }
}
