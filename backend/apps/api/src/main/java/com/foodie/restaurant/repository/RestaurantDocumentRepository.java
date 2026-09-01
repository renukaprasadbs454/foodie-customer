package com.foodie.restaurant.repository;

import com.foodie.restaurant.entity.RestaurantDocument;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantDocumentRepository extends JpaRepository<RestaurantDocument, UUID> {

    Optional<RestaurantDocument> findByIdAndRestaurantId(UUID id, UUID restaurantId);
}
