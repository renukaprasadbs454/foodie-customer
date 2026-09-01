package com.foodie.restaurant.service.impl;

import com.foodie.restaurant.service.RestaurantCacheService;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Restaurant read cache (Phase3 §6): restaurant:{id} + list geo-bucket keys, 10 min TTL, write-through evict.
 */
@Service
public class RestaurantCacheServiceImpl implements RestaurantCacheService {

    private static final Logger log = LoggerFactory.getLogger(RestaurantCacheServiceImpl.class);
    private static final Duration TTL = Duration.ofMinutes(10);
    private static final String DETAIL_PREFIX = "restaurant:";
    private static final String LIST_PREFIX = "restaurants:list:";

    private final StringRedisTemplate redisTemplate;

    public RestaurantCacheServiceImpl(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Optional<String> getDetailJson(UUID restaurantId) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(DETAIL_PREFIX + restaurantId));
    }

    @Override
    public void putDetailJson(UUID restaurantId, String json) {
        redisTemplate.opsForValue().set(DETAIL_PREFIX + restaurantId, json, TTL);
    }

    @Override
    public Optional<String> getListJson(String cacheKey) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(LIST_PREFIX + cacheKey));
    }

    @Override
    public void putListJson(String cacheKey, String json) {
        redisTemplate.opsForValue().set(LIST_PREFIX + cacheKey, json, TTL);
    }

    @Override
    public void evictRestaurant(UUID restaurantId) {
        redisTemplate.delete(DETAIL_PREFIX + restaurantId);
        evictAllListCaches();
    }

    @Override
    public void evictAllListCaches() {
        Set<String> keys = redisTemplate.keys(LIST_PREFIX + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
            log.debug("Evicted {} restaurant list cache keys", keys.size());
        }
    }
}
