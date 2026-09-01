package com.foodie.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Admin email/password login (GAP-API-13). Not used by Customer/Restaurant/Delivery.
 */
public record AdminLoginRequestDto(
        @NotBlank
        @Email
        @Size(max = 255)
        @Schema(example = "admin@foodie.local")
        String email,

        @NotBlank
        @Size(min = 1, max = 128)
        @Schema(example = "ChangeMe@123")
        String password,

        @Size(max = 255)
        @Schema(example = "Admin Panel / Chrome")
        String deviceInfo
) {
}
