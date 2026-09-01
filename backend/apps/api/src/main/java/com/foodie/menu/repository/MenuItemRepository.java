package com.foodie.menu.repository;

import com.foodie.menu.entity.MenuItem;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {

    Optional<MenuItem> findByIdAndRestaurantId(UUID id, UUID restaurantId);

    List<MenuItem> findByRestaurantIdOrderByCreatedAtAsc(UUID restaurantId);

    List<MenuItem> findByCategoryIdOrderByCreatedAtAsc(UUID categoryId);

    List<MenuItem> findByNameContainingIgnoreCase(String query);

    List<MenuItem> findByRestaurantIdAndAvailableTrue(UUID restaurantId);
}
