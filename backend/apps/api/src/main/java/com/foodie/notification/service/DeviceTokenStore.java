package com.foodie.notification.service;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * FCM device tokens are not in Phase3 schema. Redis holds the latest token per credential
 * (reconstructable: missing token → SKIPPED/FAILED push, no data loss in Postgres).
 */
@Service
public class DeviceTokenStore {

    private static final String PREFIX = "fcm:device:";
    private static final Duration TTL = Duration.ofDays(90);

    private final StringRedisTemplate redisTemplate;

    public DeviceTokenStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Optional<String> find(UUID userCredentialId) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(PREFIX + userCredentialId));
    }

    public void save(UUID userCredentialId, String token) {
        if (token == null || token.isBlank()) {
            redisTemplate.delete(PREFIX + userCredentialId);
            return;
        }
        redisTemplate.opsForValue().set(PREFIX + userCredentialId, token.trim(), TTL);
    }
}
