package com.foodie.favorite.service.impl;

import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.favorite.entity.FavoriteRestaurant;
import com.foodie.favorite.repository.FavoriteRestaurantRepository;
import com.foodie.favorite.service.FavoriteService;
import com.foodie.restaurant.dto.response.RestaurantSummaryResponseDto;
import com.foodie.restaurant.service.RestaurantService;
import com.foodie.shared.contract.CustomerSummaryProvider;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FavoriteServiceImpl implements FavoriteService {

    private final FavoriteRestaurantRepository favoriteRestaurantRepository;
    private final CustomerSummaryProvider customerSummaryProvider;
    private final RestaurantService restaurantService;

    public FavoriteServiceImpl(
            FavoriteRestaurantRepository favoriteRestaurantRepository,
            CustomerSummaryProvider customerSummaryProvider,
            RestaurantService restaurantService
    ) {
        this.favoriteRestaurantRepository = favoriteRestaurantRepository;
        this.customerSummaryProvider = customerSummaryProvider;
        this.restaurantService = restaurantService;
    }

    @Override
    @Transactional
    public void addFavoriteRestaurant(UUID userCredentialId, UUID restaurantId) {
        UUID customerId = resolveCustomerId(userCredentialId);
        if (!favoriteRestaurantRepository.existsByCustomerIdAndRestaurantId(customerId, restaurantId)) {
            favoriteRestaurantRepository.save(FavoriteRestaurant.create(customerId, restaurantId));
        }
    }

    @Override
    @Transactional
    public void removeFavoriteRestaurant(UUID userCredentialId, UUID restaurantId) {
        UUID customerId = resolveCustomerId(userCredentialId);
        favoriteRestaurantRepository.deleteByCustomerIdAndRestaurantId(customerId, restaurantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RestaurantSummaryResponseDto> getFavoriteRestaurants(UUID userCredentialId) {
        UUID customerId = resolveCustomerId(userCredentialId);
        List<FavoriteRestaurant> favorites = favoriteRestaurantRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);

        return favorites.stream()
                .map(fav -> {
                    try {
                        return restaurantService.getById(fav.getRestaurantId(), userCredentialId, false);
                    } catch (Exception ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .map(detail -> new RestaurantSummaryResponseDto(
                        detail.restaurantId(),
                        detail.name(),
                        detail.cuisineTypes(),
                        detail.avgRating(),
                        detail.latitude(),
                        detail.longitude(),
                        detail.coverImageUrl() != null ? detail.coverImageUrl() : detail.logoImageUrl()
                ))
                .toList();
    }

    private UUID resolveCustomerId(UUID userCredentialId) {
        return customerSummaryProvider.findByUserCredentialId(userCredentialId)
                .map(CustomerSummaryProvider.CustomerSummary::customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));
    }
}
