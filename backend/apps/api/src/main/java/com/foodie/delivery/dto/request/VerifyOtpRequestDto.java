package com.foodie.delivery.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequestDto(
        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "otp must be 6 digits")
        String otp
) {
}
