package com.foodie.menu.repository;

import com.foodie.menu.entity.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    Optional<Category> findByIdAndRestaurantId(UUID id, UUID restaurantId);

    List<Category> findByRestaurantIdOrderByDisplayOrderAsc(UUID restaurantId);
}
