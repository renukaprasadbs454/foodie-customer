package com.foodie.payment.service;

import java.time.Duration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Redis dedup for Razorpay webhook event IDs (Phase3 §8.3).
 * Mark only after successful handling so failed attempts remain retryable.
 */
@Service
public class WebhookDedupService {

    private static final Duration TTL = Duration.ofHours(48);
    private static final String PREFIX = "webhook:razorpay:";

    private final StringRedisTemplate redisTemplate;

    public WebhookDedupService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isDuplicate(String eventId) {
        if (eventId == null || eventId.isBlank()) {
            return false;
        }
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + eventId));
    }

    public void markProcessed(String eventId) {
        if (eventId == null || eventId.isBlank()) {
            return;
        }
        redisTemplate.opsForValue().set(PREFIX + eventId, "1", TTL);
    }
}
