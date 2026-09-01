package com.foodie.wallet.dto.response;

import com.foodie.common.enums.LedgerEntryType;
import com.foodie.common.enums.LedgerReferenceType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record LedgerEntryResponseDto(
        UUID ledgerEntryId,
        LedgerEntryType entryType,
        BigDecimal amount,
        LedgerReferenceType referenceType,
        UUID referenceId,
        Instant createdAt
) {
}
