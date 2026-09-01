package com.foodie.restaurant.service.impl;

import com.foodie.restaurant.repository.RestaurantRepository;
import com.foodie.shared.contract.RestaurantPickupQuery;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RestaurantPickupQueryImpl implements RestaurantPickupQuery {

    private final RestaurantRepository restaurantRepository;

    public RestaurantPickupQueryImpl(RestaurantRepository restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PickupLocation> findByRestaurantId(UUID restaurantId) {
        return restaurantRepository.findById(restaurantId).map(restaurant -> {
            var address = restaurant.getAddress();
            return new PickupLocation(
                    restaurant.getId(),
                    restaurant.getName(),
                    address.getLine1(),
                    address.getLine2(),
                    address.getCity(),
                    address.getPincode(),
                    address.getLatitude(),
                    address.getLongitude()
            );
        });
    }
}
