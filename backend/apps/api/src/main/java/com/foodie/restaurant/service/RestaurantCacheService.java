package com.foodie.restaurant.service;

import java.util.Optional;
import java.util.UUID;

public interface RestaurantCacheService {

    Optional<String> getDetailJson(UUID restaurantId);

    void putDetailJson(UUID restaurantId, String json);

    Optional<String> getListJson(String cacheKey);

    void putListJson(String cacheKey, String json);

    void evictRestaurant(UUID restaurantId);

    void evictAllListCaches();

    static String geoBucket(Double lat, Double lng) {
        if (lat == null || lng == null) {
            return "nogeo";
        }
        long latBucket = Math.round(lat * 20);
        long lngBucket = Math.round(lng * 20);
        return latBucket + ":" + lngBucket;
    }
}
