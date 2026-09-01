package com.foodie.admin.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.delivery.dto.request.UpdateDeliveryPricingRequestDto;
import com.foodie.delivery.dto.response.DeliveryPricingConfigResponseDto;
import com.foodie.delivery.service.DeliveryPricingService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/delivery-pricing")
@Tag(name = "Admin — Delivery Pricing")
public class AdminDeliveryPricingController {

    private final DeliveryPricingService deliveryPricingService;

    public AdminDeliveryPricingController(DeliveryPricingService deliveryPricingService) {
        this.deliveryPricingService = deliveryPricingService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Get delivery partner pricing rules (Min price vs Money/KM)")
    public ResponseEntity<ApiResponse<DeliveryPricingConfigResponseDto>> getPricingConfig() {
        return ResponseEntity.ok(ApiResponse.success(deliveryPricingService.getPricingConfig()));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Update delivery partner pricing rules (Min price vs Money/KM)")
    public ResponseEntity<ApiResponse<DeliveryPricingConfigResponseDto>> updatePricingConfig(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpdateDeliveryPricingRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                deliveryPricingService.updatePricingConfig(principal.userId(), request)));
    }
}
