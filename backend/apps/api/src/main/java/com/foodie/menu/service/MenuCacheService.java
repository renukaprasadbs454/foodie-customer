package com.foodie.menu.service;

import java.util.Optional;
import java.util.UUID;

public interface MenuCacheService {

    Optional<String> get(UUID restaurantId);

    void put(UUID restaurantId, String json);

    void evict(UUID restaurantId);
}
