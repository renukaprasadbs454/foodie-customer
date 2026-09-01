package com.foodie.security.ratelimit;

import com.foodie.common.exception.RateLimitedException;
import java.time.Duration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class RedisRateLimiter {

    private final StringRedisTemplate redisTemplate;

    public RedisRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void check(String key, int maxRequests, Duration window) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count == null) {
            throw new RateLimitedException(window.toSeconds());
        }
        if (count == 1L) {
            redisTemplate.expire(key, window);
        }
        if (count > maxRequests) {
            Long ttl = redisTemplate.getExpire(key);
            long retryAfter = ttl == null || ttl < 0 ? window.toSeconds() : ttl;
            throw new RateLimitedException(retryAfter);
        }
    }
}
