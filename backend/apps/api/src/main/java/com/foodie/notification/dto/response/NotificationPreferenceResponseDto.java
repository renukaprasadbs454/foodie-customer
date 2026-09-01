package com.foodie.notification.dto.response;

public record NotificationPreferenceResponseDto(
        boolean pushEnabled,
        boolean smsEnabled
) {
}
