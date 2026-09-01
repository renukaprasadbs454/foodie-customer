package com.foodie.order.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.common.enums.OrderStatus;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.order.dto.request.CreateOrderRequestDto;
import com.foodie.order.dto.request.TransitionOrderStatusRequestDto;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.order.dto.response.OrderSummaryResponseDto;
import com.foodie.order.service.OrderService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
@Tag(name = "Order")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Place order from cart (idempotent checkout)")
    public ResponseEntity<ApiResponse<OrderResponseDto>> createOrder(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateOrderRequestDto request
    ) {
        OrderResponseDto created = orderService.createFromCart(principal.userId(), request, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "List my orders")
    public ResponseEntity<ApiResponse<List<OrderSummaryResponseDto>>> listMyOrders(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        var result = orderService.listForCustomer(
                principal.userId(), parseStatus(status), page, size, sort);
        return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
    }

    @GetMapping("/me/active")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Get my current active order (for live tracking bar)")
    public ResponseEntity<ApiResponse<OrderResponseDto>> getActiveOrder(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getActiveOrderForCustomer(principal.userId())));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Cancel an order (if allowed by status)")
    public ResponseEntity<ApiResponse<OrderResponseDto>> cancelOrder(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @RequestParam(required = false) String reason
    ) {
        return ResponseEntity.ok(ApiResponse.success(orderService.cancelOrder(id, principal.userId(), reason)));
    }

    @GetMapping("/restaurant")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "List restaurant order queue (own restaurant from JWT)")
    public ResponseEntity<ApiResponse<List<OrderSummaryResponseDto>>> listRestaurantOrders(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        var result = orderService.listForRestaurant(
                principal.userId(), parseStatus(status), page, size, sort);
        return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT','DELIVERY_PARTNER','ADMIN')")
    @Operation(summary = "Get order by id (visibility scoped by role)")
    public ResponseEntity<ApiResponse<OrderResponseDto>> getOrder(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                orderService.getById(id, principal.userId(), principal.userType())));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT','ADMIN')")
    @Operation(summary = "Transition order status (state-machine enforced)")
    public ResponseEntity<ApiResponse<OrderResponseDto>> transitionStatus(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody TransitionOrderStatusRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(orderService.transition(
                id,
                request.targetStatus(),
                request.reason(),
                principal.userId(),
                principal.userType()
        )));
    }

    private static OrderStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return OrderStatus.valueOf(status.trim());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Invalid status filter.");
        }
    }
}
