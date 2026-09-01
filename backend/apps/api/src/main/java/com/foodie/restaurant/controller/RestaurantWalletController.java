package com.foodie.restaurant.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.security.principal.AuthPrincipal;
import com.foodie.wallet.dto.request.PayoutRequestDto;
import com.foodie.wallet.dto.response.LedgerEntryResponseDto;
import com.foodie.wallet.dto.response.PayoutResponseDto;
import com.foodie.wallet.dto.response.WalletBalanceResponseDto;
import com.foodie.wallet.service.WalletService;
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
@RequestMapping("/api/v1/restaurants/me/wallet")
@Tag(name = "Restaurant Wallet")
public class RestaurantWalletController {

    private final WalletService walletService;

    public RestaurantWalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/balance")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Get my restaurant wallet balance")
    public ResponseEntity<ApiResponse<WalletBalanceResponseDto>> getBalance(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(walletService.getRestaurantBalance(principal.userId())));
    }

    @GetMapping("/ledger")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Get my restaurant ledger history")
    public ResponseEntity<ApiResponse<List<LedgerEntryResponseDto>>> getLedger(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdAtFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdAtTo
    ) {
        var result = walletService.getRestaurantLedger(
                principal.userId(), page, size, sort, createdAtFrom, createdAtTo);
        return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
    }

    @PostMapping("/payout-requests")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Request payout for restaurant wallet earnings")
    public ResponseEntity<ApiResponse<PayoutResponseDto>> requestPayout(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody PayoutRequestDto request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success(
                        walletService.requestRestaurantPayout(principal.userId(), request, idempotencyKey)));
    }
}
