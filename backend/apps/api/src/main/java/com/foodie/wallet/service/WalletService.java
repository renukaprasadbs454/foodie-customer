package com.foodie.wallet.service;

import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.wallet.dto.request.PayoutRequestDto;
import com.foodie.wallet.dto.response.LedgerEntryResponseDto;
import com.foodie.wallet.dto.response.PayoutResponseDto;
import com.foodie.wallet.dto.response.WalletBalanceResponseDto;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.foodie.common.enums.UserType;

public interface WalletService {

        WalletBalanceResponseDto getBalance(UUID userCredentialId, UserType userType);

        PageResult<LedgerEntryResponseDto> getLedger(
                        UUID userCredentialId,
                        UserType userType,
                        int page,
                        int size,
                        String sort,
                        Instant createdAtFrom,
                        Instant createdAtTo);

        PayoutResponseDto requestPayout(UUID userCredentialId, PayoutRequestDto request, String idempotencyKey);

        WalletBalanceResponseDto getRestaurantBalance(UUID ownerCredentialId);

        PageResult<LedgerEntryResponseDto> getRestaurantLedger(
                        UUID ownerCredentialId,
                        int page,
                        int size,
                        String sort,
                        Instant createdAtFrom,
                        Instant createdAtTo);

        PayoutResponseDto requestRestaurantPayout(
                        UUID ownerCredentialId,
                        PayoutRequestDto request,
                        String idempotencyKey);

        /**
         * Idempotent CREDIT used by domain event listeners (driver earnings / refund
         * credits).
         */
        LedgerEntryResponseDto credit(
                        OwnerType ownerType,
                        UUID ownerId,
                        BigDecimal amount,
                        LedgerReferenceType referenceType,
                        UUID referenceId);

        /**
         * Idempotent DEBIT used when payout completion is wired (bank settlement out of
         * Module 9 scope).
         */
        LedgerEntryResponseDto debit(
                        OwnerType ownerType,
                        UUID ownerId,
                        BigDecimal amount,
                        LedgerReferenceType referenceType,
                        UUID referenceId);

        record PageResult<T>(List<T> items, PaginationMeta pagination) {
        }
}
