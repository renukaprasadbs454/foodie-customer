package com.foodie.menu.service.impl;

import com.foodie.menu.service.MenuCacheService;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Menu read cache: menu:{restaurantId}, 10 min, write-through evict (Phase3
 * §6).
 */
@Service
public class MenuCacheServiceImpl implements MenuCacheService {

    private static final Logger log = LoggerFactory.getLogger(MenuCacheServiceImpl.class);
    private static final Duration TTL = Duration.ofMinutes(10);
    private static final String PREFIX = "menu:";

    private final StringRedisTemplate redisTemplate;

    public MenuCacheServiceImpl(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Optional<String> get(UUID restaurantId) {
        try {
            return Optional.ofNullable(redisTemplate.opsForValue().get(PREFIX + restaurantId));
        } catch (Exception e) {
            log.warn("Redis unavailable for menu cache get: {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void put(UUID restaurantId, String json) {
        try {
            redisTemplate.opsForValue().set(PREFIX + restaurantId, json, TTL);
        } catch (Exception e) {
            log.warn("Redis unavailable for menu cache put: {}", e.getMessage());
        }
    }

    @Override
    public void evict(UUID restaurantId) {
        try {
            redisTemplate.delete(PREFIX + restaurantId);
        } catch (Exception e) {
            log.warn("Redis unavailable for menu cache evict: {}", e.getMessage());
        }
    }
}
