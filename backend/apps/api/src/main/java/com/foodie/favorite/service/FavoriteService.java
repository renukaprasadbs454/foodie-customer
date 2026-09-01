package com.foodie.favorite.service;

import com.foodie.restaurant.dto.response.RestaurantSummaryResponseDto;
import java.util.List;
import java.util.UUID;

public interface FavoriteService {

    void addFavoriteRestaurant(UUID userCredentialId, UUID restaurantId);

    void removeFavoriteRestaurant(UUID userCredentialId, UUID restaurantId);

    List<RestaurantSummaryResponseDto> getFavoriteRestaurants(UUID userCredentialId);
}
