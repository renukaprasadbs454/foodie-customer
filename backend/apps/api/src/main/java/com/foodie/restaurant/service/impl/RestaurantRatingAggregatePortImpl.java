package com.foodie.restaurant.service.impl;

import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.restaurant.entity.Restaurant;
import com.foodie.restaurant.repository.RestaurantRepository;
import com.foodie.shared.contract.RestaurantRatingAggregatePort;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RestaurantRatingAggregatePortImpl implements RestaurantRatingAggregatePort {

    private final RestaurantRepository restaurantRepository;

    public RestaurantRatingAggregatePortImpl(RestaurantRepository restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
    }

    @Override
    @Transactional
    public void recalculateAvgRating(UUID restaurantId, BigDecimal averageRestaurantRating) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found."));
        restaurant.updateAvgRating(averageRestaurantRating);
    }
}
