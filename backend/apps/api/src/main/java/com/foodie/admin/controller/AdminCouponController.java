package com.foodie.admin.controller;

import com.foodie.admin.service.AdminOperationsService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.coupon.dto.request.CreateCouponRequestDto;
import com.foodie.coupon.dto.response.CouponResponseDto;
import com.foodie.coupon.dto.response.DeactivateCouponResponseDto;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin coupon HTTP (API Contracts MODULE 13.4 / 13.5).
 * Delegates mutations to CouponAdminService; Admin owns audit_log writes.
 */
@RestController
@RequestMapping("/api/v1/admin/coupons")
@Tag(name = "Admin — Coupon")
public class AdminCouponController {

    private final AdminOperationsService adminOperationsService;

    public AdminCouponController(AdminOperationsService adminOperationsService) {
        this.adminOperationsService = adminOperationsService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Create a coupon")
    public ResponseEntity<ApiResponse<CouponResponseDto>> create(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CreateCouponRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(adminOperationsService.createCoupon(principal.userId(), request)));
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Deactivate a coupon")
    public ResponseEntity<ApiResponse<DeactivateCouponResponseDto>> deactivate(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID couponId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                adminOperationsService.deactivateCoupon(principal.userId(), couponId)));
    }
}
