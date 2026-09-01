package com.foodie.restaurant.service.impl;

import com.foodie.shared.contract.RestaurantSummaryProvider;
import com.foodie.restaurant.repository.RestaurantRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RestaurantSummaryProviderImpl implements RestaurantSummaryProvider {

    private final RestaurantRepository restaurantRepository;

    public RestaurantSummaryProviderImpl(RestaurantRepository restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RestaurantSummary> findByRestaurantId(UUID restaurantId) {
        return restaurantRepository.findById(restaurantId).map(this::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RestaurantSummary> findByOwnerUserCredentialId(UUID ownerUserCredentialId) {
        return restaurantRepository.findByOwnerUserCredentialId(ownerUserCredentialId).map(this::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> findOwnerUserCredentialIdByRestaurantId(UUID restaurantId) {
        return restaurantRepository.findById(restaurantId).map(r -> r.getOwnerUserCredentialId());
    }

    private RestaurantSummary toSummary(com.foodie.restaurant.entity.Restaurant r) {
        return new RestaurantSummary(
                r.getId(),
                r.getName(),
                r.getStatus().name(),
                r.getLogoImageKey()
        );
    }
}
