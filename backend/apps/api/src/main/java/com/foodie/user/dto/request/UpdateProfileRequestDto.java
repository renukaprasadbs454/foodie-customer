package com.foodie.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequestDto(
        @NotBlank
        @Size(min = 2, max = 100)
        String fullName,

        @Email
        @Size(max = 255)
        String email
) {
}
