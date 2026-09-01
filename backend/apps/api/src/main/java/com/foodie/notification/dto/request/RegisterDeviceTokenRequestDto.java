package com.foodie.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterDeviceTokenRequestDto(
        @NotBlank @Size(max = 512) String deviceToken
) {
}
