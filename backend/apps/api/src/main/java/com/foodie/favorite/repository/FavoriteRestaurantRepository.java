package com.foodie.favorite.repository;

import com.foodie.favorite.entity.FavoriteRestaurant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRestaurantRepository extends JpaRepository<FavoriteRestaurant, UUID> {

    List<FavoriteRestaurant> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    Optional<FavoriteRestaurant> findByCustomerIdAndRestaurantId(UUID customerId, UUID restaurantId);

    boolean existsByCustomerIdAndRestaurantId(UUID customerId, UUID restaurantId);

    void deleteByCustomerIdAndRestaurantId(UUID customerId, UUID restaurantId);
}
