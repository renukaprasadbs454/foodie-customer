package com.foodie.admin.controller;

import com.foodie.admin.dto.request.CommissionConfigDto;
import com.foodie.admin.dto.response.PaymentSettlementResponseDto;
import com.foodie.admin.dto.response.PaymentSplitBreakdownDto;
import com.foodie.admin.service.AdminPaymentService;
import com.foodie.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/payments")
@Tag(name = "Admin — Payments & Settlement")
public class AdminPaymentController {

    private final AdminPaymentService adminPaymentService;
    private final com.foodie.restaurant.service.RestaurantSettlementService restaurantSettlementService;

    public AdminPaymentController(
            AdminPaymentService adminPaymentService,
            com.foodie.restaurant.service.RestaurantSettlementService restaurantSettlementService) {
        this.adminPaymentService = adminPaymentService;
        this.restaurantSettlementService = restaurantSettlementService;
    }

    @GetMapping("/settlements")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "List payment settlements with admin escrow & split breakdown")
    public ResponseEntity<ApiResponse<List<PaymentSettlementResponseDto>>> listSettlements() {
        return ResponseEntity.ok(ApiResponse.success(adminPaymentService.listSettlements()));
    }

    @GetMapping("/restaurant-settlements")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "List restaurant settlements for admin review")
    public ResponseEntity<ApiResponse<List<com.foodie.restaurant.dto.response.RestaurantSettlementResponseDto>>> listRestaurantSettlements(
            @RequestParam(required = false) java.util.UUID restaurantId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success(
                restaurantSettlementService.getAllSettlementsForAdmin(restaurantId, status)));
    }

    @PostMapping("/restaurant-settlements/disburse")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Disburse payment to restaurant with transaction reference")
    public ResponseEntity<ApiResponse<com.foodie.restaurant.dto.response.RestaurantSettlementResponseDto>> disburseRestaurantSettlement(
            @Valid @RequestBody com.foodie.restaurant.dto.request.DisburseSettlementRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(
                restaurantSettlementService.disburseSettlement(request.settlementId(), request.paymentReference())));
    }

    @GetMapping("/commission-rules")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Get active commission and platform fee rules")
    public ResponseEntity<ApiResponse<CommissionConfigDto>> getCommissionRules() {
        return ResponseEntity.ok(ApiResponse.success(adminPaymentService.getCommissionRules()));
    }

    @PostMapping("/commission-rules")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Update active commission and platform fee rules")
    public ResponseEntity<ApiResponse<CommissionConfigDto>> updateCommissionRules(
            @Valid @RequestBody CommissionConfigDto config) {
        return ResponseEntity.ok(ApiResponse.success(adminPaymentService.updateCommissionRules(config)));
    }

    @PostMapping("/calculate-split")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'FINANCE', 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Calculate payment split breakdown for given subtotal and delivery fee")
    public ResponseEntity<ApiResponse<PaymentSplitBreakdownDto>> calculateSplit(
            @RequestParam(defaultValue = "0.00") BigDecimal foodSubtotal,
            @RequestParam(defaultValue = "0.00") BigDecimal deliveryFee) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPaymentService.calculateSplit(foodSubtotal, deliveryFee)));
    }
}
