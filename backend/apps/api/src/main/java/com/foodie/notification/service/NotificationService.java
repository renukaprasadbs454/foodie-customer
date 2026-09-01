package com.foodie.notification.service;

import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.NotificationEventType;
import com.foodie.notification.dto.request.UpdateNotificationPreferenceRequestDto;
import com.foodie.notification.dto.response.NotificationPreferenceResponseDto;
import com.foodie.notification.dto.response.NotificationReadResponseDto;
import com.foodie.notification.dto.response.NotificationResponseDto;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface NotificationService {

    void send(UUID userCredentialId, NotificationEventType eventType, Map<String, String> params);

    PageResult<NotificationResponseDto> list(UUID userCredentialId, boolean unreadOnly, int page, int size);

    NotificationReadResponseDto markRead(UUID userCredentialId, UUID notificationLogId);

    NotificationPreferenceResponseDto getPreferences(UUID userCredentialId);

    NotificationPreferenceResponseDto updatePreferences(
            UUID userCredentialId, UpdateNotificationPreferenceRequestDto request);

    void registerDeviceToken(UUID userCredentialId, String deviceToken);

    record PageResult<T>(List<T> items, PaginationMeta pagination) {
    }
}
