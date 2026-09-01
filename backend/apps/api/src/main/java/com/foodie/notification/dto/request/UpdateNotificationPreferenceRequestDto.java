package com.foodie.notification.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateNotificationPreferenceRequestDto(
        @NotNull Boolean pushEnabled,
        @NotNull Boolean smsEnabled
) {
}
