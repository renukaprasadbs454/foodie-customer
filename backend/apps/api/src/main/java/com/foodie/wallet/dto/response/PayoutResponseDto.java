package com.foodie.wallet.dto.response;

import com.foodie.common.enums.PayoutStatus;
import java.math.BigDecimal;
import java.util.UUID;

public record PayoutResponseDto(
                UUID payoutId,
                PayoutStatus status,
                BigDecimal amount,
                String accountHolderName,
                String accountNumber,
                String ifscCode,
                String bankName) {
}
