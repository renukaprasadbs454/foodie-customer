package com.foodie.review.repository;

import com.foodie.review.entity.Review;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    boolean existsByOrderId(UUID orderId);

    Page<Review> findByRestaurantId(UUID restaurantId, Pageable pageable);

    @Query("select coalesce(avg(r.restaurantRating), 0) from Review r where r.restaurantId = :restaurantId")
    Double averageRestaurantRating(@Param("restaurantId") UUID restaurantId);
}
