package com.foodie.restaurant.repository;

import com.foodie.restaurant.entity.RestaurantLegalDetail;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RestaurantLegalDetailRepository extends JpaRepository<RestaurantLegalDetail, UUID> {

    Optional<RestaurantLegalDetail> findByRestaurantId(UUID restaurantId);

    boolean existsByRestaurantId(UUID restaurantId);
}
