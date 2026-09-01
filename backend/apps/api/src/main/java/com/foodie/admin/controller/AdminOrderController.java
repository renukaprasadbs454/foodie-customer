package com.foodie.admin.controller;

import com.foodie.admin.dto.request.OverrideOrderStatusRequestDto;
import com.foodie.admin.service.AdminOperationsService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/orders")
@Tag(name = "Admin — Order")
public class AdminOrderController {

    private final AdminOperationsService adminOperationsService;

    public AdminOrderController(AdminOperationsService adminOperationsService) {
        this.adminOperationsService = adminOperationsService;
    }

    @PostMapping("/{id}/override-status")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Emergency order status override (state-machine graph still enforced)")
    public ResponseEntity<ApiResponse<OrderResponseDto>> overrideStatus(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID orderId,
            @Valid @RequestBody OverrideOrderStatusRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                adminOperationsService.overrideOrderStatus(principal.userId(), orderId, request)));
    }
}
