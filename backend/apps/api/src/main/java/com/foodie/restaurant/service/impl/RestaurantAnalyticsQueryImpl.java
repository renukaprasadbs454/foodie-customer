package com.foodie.restaurant.service.impl;

import com.foodie.restaurant.repository.RestaurantAnalyticsProjectionRepository;
import com.foodie.shared.contract.RestaurantAnalyticsQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RestaurantAnalyticsQueryImpl implements RestaurantAnalyticsQuery {

    private final RestaurantAnalyticsProjectionRepository repository;

    public RestaurantAnalyticsQueryImpl(RestaurantAnalyticsProjectionRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public long countApproved() {
        return repository.countApproved();
    }
}
