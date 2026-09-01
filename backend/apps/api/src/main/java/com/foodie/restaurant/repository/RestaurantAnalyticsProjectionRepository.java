package com.foodie.restaurant.repository;

import com.foodie.restaurant.entity.Restaurant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * Read-only analytics projections owned by Restaurant (Phase3 §2.14).
 */
public interface RestaurantAnalyticsProjectionRepository extends JpaRepository<Restaurant, UUID> {

    @Query("""
            select count(r) from Restaurant r
            where r.status = com.foodie.common.enums.RestaurantStatus.APPROVED
            """)
    long countApproved();
}
