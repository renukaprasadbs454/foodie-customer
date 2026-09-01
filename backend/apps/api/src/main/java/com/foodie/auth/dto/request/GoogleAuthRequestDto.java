package com.foodie.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleAuthRequestDto(
        @NotBlank
        @Schema(description = "Google-issued ID token from native Sign-In SDK")
        String idToken,

        @Size(max = 255)
        String deviceInfo
) {
}
