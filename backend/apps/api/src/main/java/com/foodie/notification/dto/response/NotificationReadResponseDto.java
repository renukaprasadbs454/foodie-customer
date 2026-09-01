package com.foodie.notification.dto.response;

import java.time.Instant;
import java.util.UUID;

public record NotificationReadResponseDto(
        UUID notificationLogId,
        Instant readAt
) {
}
