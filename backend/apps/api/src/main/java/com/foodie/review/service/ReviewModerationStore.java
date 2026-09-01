package com.foodie.review.service;

import java.time.Duration;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Moderation flags are not Phase3 schema columns. Redis holds a soft flag so public list can
 * hide flagged reviews without inventing DB columns. Reconstructable: empty Redis → all visible.
 * Admin REST for flagging is deferred to Admin module.
 */
@Service
public class ReviewModerationStore {

    private static final String PREFIX = "review:flagged:";
    private static final Duration TTL = Duration.ofDays(365);

    private final StringRedisTemplate redisTemplate;

    public ReviewModerationStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isFlagged(UUID reviewId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + reviewId));
    }

    public void flag(UUID reviewId, String reason) {
        String value = reason == null || reason.isBlank() ? "flagged" : reason.trim();
        redisTemplate.opsForValue().set(PREFIX + reviewId, value, TTL);
    }

    public void clear(UUID reviewId) {
        redisTemplate.delete(PREFIX + reviewId);
    }
}
