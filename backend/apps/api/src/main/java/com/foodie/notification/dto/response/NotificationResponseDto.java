package com.foodie.notification.dto.response;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponseDto(
        UUID notificationLogId,
        String title,
        String body,
        Instant sentAt,
        Instant readAt
) {
}
