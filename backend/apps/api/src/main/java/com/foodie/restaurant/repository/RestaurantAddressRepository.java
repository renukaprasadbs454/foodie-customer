package com.foodie.restaurant.repository;

import com.foodie.restaurant.entity.RestaurantAddress;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantAddressRepository extends JpaRepository<RestaurantAddress, UUID> {
}
