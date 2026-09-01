package com.foodie.restaurant.repository;

import com.foodie.restaurant.entity.RestaurantBankDetails;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RestaurantBankDetailsRepository extends JpaRepository<RestaurantBankDetails, UUID> {

    Optional<RestaurantBankDetails> findByRestaurantId(UUID restaurantId);

    boolean existsByRestaurantId(UUID restaurantId);
}
