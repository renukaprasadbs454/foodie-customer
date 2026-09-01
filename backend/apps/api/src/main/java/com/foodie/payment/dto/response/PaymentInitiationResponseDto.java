package com.foodie.payment.dto.response;

import java.math.BigDecimal;

public record PaymentInitiationResponseDto(
                String razorpayOrderId,
                BigDecimal amount,
                String currency,
                String keyId,
                BigDecimal walletAmountUsed,
                String status) {
}
