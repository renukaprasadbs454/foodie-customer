package com.foodie.auth.dto.request;

import com.foodie.common.enums.UserType;
import com.foodie.common.validation.ValidPhoneNumber;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyOtpRequestDto(
        @NotBlank
        @ValidPhoneNumber
        @Schema(example = "+919876543210")
        String phoneNumber,

        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "must be exactly 6 digits")
        @Schema(example = "482913")
        String otp,

        @Schema(allowableValues = {"CUSTOMER", "RESTAURANT", "DELIVERY_PARTNER"})
        UserType userType,

        @Size(max = 255)
        @Schema(example = "iPhone 14 Pro / iOS 17.4")
        String deviceInfo
) {
}
