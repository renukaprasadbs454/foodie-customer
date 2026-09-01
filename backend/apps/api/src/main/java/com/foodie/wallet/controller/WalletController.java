package com.foodie.wallet.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.wallet.dto.request.PayoutRequestDto;
import com.foodie.wallet.dto.response.LedgerEntryResponseDto;
import com.foodie.wallet.dto.response.PayoutResponseDto;
import com.foodie.wallet.dto.response.WalletBalanceResponseDto;
import com.foodie.wallet.service.WalletService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/wallet")
@Tag(name = "Wallet")
public class WalletController {

        private final WalletService walletService;

        public WalletController(WalletService walletService) {
                this.walletService = walletService;
        }

        @GetMapping("/balance")
        @PreAuthorize("hasAnyRole('DELIVERY_PARTNER', 'CUSTOMER')")
        @Operation(summary = "Get my wallet balance (cached derived value)")
        public ResponseEntity<ApiResponse<WalletBalanceResponseDto>> getBalance(
                        @AuthenticationPrincipal AuthPrincipal principal) {
                return ResponseEntity.ok(ApiResponse
                                .success(walletService.getBalance(principal.userId(), principal.userType())));
        }

        @GetMapping("/ledger")
        @PreAuthorize("hasAnyRole('DELIVERY_PARTNER', 'CUSTOMER')")
        @Operation(summary = "Get my ledger history")
        public ResponseEntity<ApiResponse<List<LedgerEntryResponseDto>>> getLedger(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size,
                        @RequestParam(required = false) String sort,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdAtFrom,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdAtTo) {
                var result = walletService.getLedger(
                                principal.userId(), principal.userType(), page, size, sort, createdAtFrom, createdAtTo);
                return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
        }

        @PostMapping("/payout-requests")
        @PreAuthorize("hasRole('DELIVERY_PARTNER')")
        @Operation(summary = "Request a payout (REQUESTED only — bank settlement out of Module 9 scope)")
        public ResponseEntity<ApiResponse<PayoutResponseDto>> requestPayout(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @Valid @RequestBody PayoutRequestDto request,
                        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
                return ResponseEntity.status(HttpStatus.ACCEPTED)
                                .body(ApiResponse.success(
                                                walletService.requestPayout(principal.userId(), request,
                                                                idempotencyKey)));
        }
}
