package com.foodie.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record VerifyPaymentRequestDto(
        @NotNull(message = "orderId is required")
        UUID orderId,

        @NotBlank(message = "razorpayOrderId is required")
        String razorpayOrderId,

        @NotBlank(message = "razorpayPaymentId is required")
        String razorpayPaymentId,

        @NotBlank(message = "razorpaySignature is required")
        String razorpaySignature
) {
}
