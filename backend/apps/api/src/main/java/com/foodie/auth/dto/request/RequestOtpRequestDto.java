package com.foodie.auth.dto.request;

import com.foodie.common.validation.ValidPhoneNumber;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record RequestOtpRequestDto(
        @NotBlank
        @ValidPhoneNumber
        @Schema(example = "+919876543210")
        String phoneNumber
) {
}
