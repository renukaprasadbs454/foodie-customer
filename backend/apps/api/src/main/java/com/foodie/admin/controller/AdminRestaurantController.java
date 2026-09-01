package com.foodie.admin.controller;

import com.foodie.admin.dto.request.SuspendRestaurantRequestDto;
import com.foodie.admin.service.AdminOperationsService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.restaurant.dto.response.RestaurantDetailResponseDto;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/restaurants")
@Tag(name = "Admin — Restaurant")
public class AdminRestaurantController {

    private final AdminOperationsService adminOperationsService;

    public AdminRestaurantController(AdminOperationsService adminOperationsService) {
        this.adminOperationsService = adminOperationsService;
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Approve a PENDING restaurant")
    public ResponseEntity<ApiResponse<RestaurantDetailResponseDto>> approve(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID restaurantId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminOperationsService.approveRestaurant(principal.userId(), restaurantId)));
    }

    @PatchMapping("/{id}/suspend")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Suspend a restaurant")
    public ResponseEntity<ApiResponse<RestaurantDetailResponseDto>> suspend(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID restaurantId,
            @Valid @RequestBody SuspendRestaurantRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminOperationsService.suspendRestaurant(principal.userId(), restaurantId, request)));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Reject a PENDING restaurant onboarding submission")
    public ResponseEntity<ApiResponse<RestaurantDetailResponseDto>> reject(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID restaurantId,
            @Valid @RequestBody SuspendRestaurantRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminOperationsService.rejectRestaurant(principal.userId(), restaurantId, request.reason())));
    }
}
