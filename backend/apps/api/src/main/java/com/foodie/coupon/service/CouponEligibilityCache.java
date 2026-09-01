package com.foodie.coupon.service;

import java.time.Duration;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Cache-aside eligibility flag (Phase3 §6.1): {@code coupon:{couponId}:eligible:{customerId}}.
 * Reconstructable from PostgreSQL; never source of truth.
 */
@Component
public class CouponEligibilityCache {

    private static final String PREFIX = "coupon:";
    private static final String MID = ":eligible:";
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final String ELIGIBLE = "1";

    private final StringRedisTemplate redisTemplate;

    public CouponEligibilityCache(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /** Positive eligibility hint after a successful DB check (cache-aside write). */
    public void markEligible(UUID couponId, UUID customerId) {
        redisTemplate.opsForValue().set(key(couponId, customerId), ELIGIBLE, TTL);
    }

    public void invalidate(UUID couponId, UUID customerId) {
        redisTemplate.delete(key(couponId, customerId));
    }

    private static String key(UUID couponId, UUID customerId) {
        return PREFIX + couponId + MID + customerId;
    }
}
