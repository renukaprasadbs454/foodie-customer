package com.foodie.payment.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.payment.dto.request.RefundPaymentRequestDto;
import com.foodie.payment.dto.response.PaymentInitiationResponseDto;
import com.foodie.payment.dto.response.RefundInitiationResponseDto;
import com.foodie.payment.service.PaymentService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.foodie.payment.dto.request.VerifyPaymentRequestDto;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payment")
public class PaymentController {

        private final PaymentService paymentService;

        public PaymentController(PaymentService paymentService) {
                this.paymentService = paymentService;
        }

        @PostMapping("/orders/{orderId}/initiate")
        @PreAuthorize("hasRole('CUSTOMER')")
        @Operation(summary = "Initiate Razorpay payment for an order (idempotent)")
        public ResponseEntity<ApiResponse<PaymentInitiationResponseDto>> initiate(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @PathVariable UUID orderId,
                        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
                        @RequestParam(defaultValue = "false") boolean useWallet) {
                return ResponseEntity.ok(ApiResponse.success(
                                paymentService.initiate(principal.userId(), orderId, idempotencyKey, useWallet)));
        }

        @PostMapping("/verify")
        @PreAuthorize("hasRole('CUSTOMER')")
        @Operation(summary = "Verify client-side Razorpay payment signature")
        public ResponseEntity<ApiResponse<Boolean>> verify(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @Valid @RequestBody VerifyPaymentRequestDto request) {
                return ResponseEntity.ok(ApiResponse.success(
                                paymentService.verifyPayment(principal.userId(), request)));
        }

        @PostMapping("/{paymentId}/refund")
        @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'FINANCE', 'SUPER_ADMIN')")
        @Operation(summary = "Initiate refund (async; finalized by webhook)")
        public ResponseEntity<ApiResponse<RefundInitiationResponseDto>> refund(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @PathVariable UUID paymentId,
                        @Valid @RequestBody RefundPaymentRequestDto request) {
                return ResponseEntity.status(HttpStatus.ACCEPTED)
                                .body(ApiResponse.success(paymentService.refund(
                                                paymentId, request, principal.userId(), false)));
        }
}
