package com.foodie.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LogoutRequestDto(
        @NotBlank String refreshToken
) {
}
