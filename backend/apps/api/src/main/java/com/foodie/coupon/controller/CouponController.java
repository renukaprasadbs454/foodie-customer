package com.foodie.coupon.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.coupon.dto.request.ApplyCouponRequestDto;
import com.foodie.coupon.dto.response.ApplyCouponResponseDto;
import com.foodie.coupon.dto.response.EligibleCouponResponseDto;
import com.foodie.coupon.service.CouponQueryService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/coupons")
@Tag(name = "Coupon")
@Validated
public class CouponController {

    private final CouponQueryService couponQueryService;

    public CouponController(CouponQueryService couponQueryService) {
        this.couponQueryService = couponQueryService;
    }

    @GetMapping("/eligible")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "List coupons eligible for the caller's cart context")
    public ResponseEntity<ApiResponse<List<EligibleCouponResponseDto>>> listEligible(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam @NotNull UUID restaurantId,
            @RequestParam @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal cartTotal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                couponQueryService.listEligibleForCaller(principal.userId(), restaurantId, cartTotal)));
    }

    @PostMapping("/apply")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Preview coupon discount (does not redeem)")
    public ResponseEntity<ApiResponse<ApplyCouponResponseDto>> apply(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ApplyCouponRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                couponQueryService.applyForCaller(principal.userId(), request)));
    }
}
