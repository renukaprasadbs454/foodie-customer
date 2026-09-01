package com.foodie.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.enums.NotificationChannel;
import com.foodie.notification.dto.response.NotificationPreferenceResponseDto;
import java.time.Duration;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Preferences are not a Phase3-owned table. Redis stores opt-in flags (default: all enabled).
 * Reconstructable: empty Redis → defaults to enabled.
 */
@Service
public class NotificationPreferenceStore {

    private static final String PREFIX = "notif:pref:";
    private static final Duration TTL = Duration.ofDays(365);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public NotificationPreferenceStore(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public NotificationPreferenceResponseDto get(UUID userCredentialId) {
        String raw = redisTemplate.opsForValue().get(PREFIX + userCredentialId);
        if (raw == null) {
            return new NotificationPreferenceResponseDto(true, true);
        }
        try {
            return objectMapper.readValue(raw, NotificationPreferenceResponseDto.class);
        } catch (JsonProcessingException ex) {
            redisTemplate.delete(PREFIX + userCredentialId);
            return new NotificationPreferenceResponseDto(true, true);
        }
    }

    public NotificationPreferenceResponseDto save(
            UUID userCredentialId, boolean pushEnabled, boolean smsEnabled) {
        var prefs = new NotificationPreferenceResponseDto(pushEnabled, smsEnabled);
        try {
            redisTemplate.opsForValue().set(
                    PREFIX + userCredentialId, objectMapper.writeValueAsString(prefs), TTL);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to store notification preferences.", ex);
        }
        return prefs;
    }

    public boolean isEnabled(UUID userCredentialId, NotificationChannel channel) {
        NotificationPreferenceResponseDto prefs = get(userCredentialId);
        return switch (channel) {
            case PUSH -> prefs.pushEnabled();
            case SMS -> prefs.smsEnabled();
        };
    }
}
