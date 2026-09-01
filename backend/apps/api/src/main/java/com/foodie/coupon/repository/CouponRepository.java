package com.foodie.coupon.repository;

import com.foodie.coupon.entity.Coupon;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CouponRepository extends JpaRepository<Coupon, UUID> {

    Optional<Coupon> findByCode(String code);

    boolean existsByCode(String code);

    @Query("""
            SELECT c FROM Coupon c
            WHERE c.active = true
              AND c.expiryDate > :now
              AND (c.restaurantId IS NULL OR c.restaurantId = :restaurantId)
              AND c.minOrderAmount <= :cartTotal
            ORDER BY c.code ASC
            """)
    List<Coupon> findEligibleCandidates(
            @Param("restaurantId") UUID restaurantId,
            @Param("cartTotal") java.math.BigDecimal cartTotal,
            @Param("now") Instant now
    );
}
