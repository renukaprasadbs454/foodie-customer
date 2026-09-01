package com.foodie.notification.mapper;

import com.foodie.notification.dto.response.NotificationReadResponseDto;
import com.foodie.notification.dto.response.NotificationResponseDto;
import com.foodie.notification.entity.NotificationLog;

public final class NotificationMapper {

    private NotificationMapper() {
    }

    public static NotificationResponseDto toResponse(NotificationLog log) {
        return new NotificationResponseDto(
                log.getId(),
                log.getTitle(),
                log.getBody(),
                log.getSentAt(),
                log.getReadAt()
        );
    }

    public static NotificationReadResponseDto toReadResponse(NotificationLog log) {
        return new NotificationReadResponseDto(log.getId(), log.getReadAt());
    }
}
