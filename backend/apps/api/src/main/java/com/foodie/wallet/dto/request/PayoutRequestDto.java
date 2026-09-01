package com.foodie.wallet.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PayoutRequestDto(
                @NotNull @DecimalMin(value = "0.01", inclusive = true) BigDecimal amount,
                String accountHolderName,
                String accountNumber,
                String ifscCode,
                String bankName) {
}
