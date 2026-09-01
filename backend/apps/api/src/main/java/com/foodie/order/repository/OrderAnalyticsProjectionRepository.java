package com.foodie.order.repository;

import com.foodie.order.entity.Order;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Read-only analytics projections owned by Order (Phase3 §2.14).
 */
public interface OrderAnalyticsProjectionRepository extends JpaRepository<Order, UUID> {

    @Query("""
            select count(o) from Order o
            where o.placedAt >= :from and o.placedAt < :to
            """)
    long countPlacedBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("""
            select count(distinct o.restaurantId) from Order o
            where o.placedAt >= :from and o.placedAt < :to
            """)
    long countDistinctRestaurantsWithOrdersBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("""
            select count(distinct o.deliveryPartnerId) from Order o
            where o.placedAt >= :from and o.placedAt < :to
              and o.deliveryPartnerId is not null
            """)
    long countDistinctPartnersWithOrdersBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("""
            select o.status, count(o) from Order o
            where o.placedAt >= :from and o.placedAt < :to
            group by o.status
            """)
    List<Object[]> countByStatusPlacedBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query(value = """
            SELECT CAST((o.placed_at AT TIME ZONE 'UTC') AS date) AS day,
                   COUNT(*)::bigint AS order_count,
                   COALESCE(SUM(o.total_amount), 0) AS revenue
            FROM "order" o
            WHERE o.placed_at >= :from AND o.placed_at < :to
            GROUP BY CAST((o.placed_at AT TIME ZONE 'UTC') AS date)
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> dailySalesByPlacedAt(@Param("from") Instant from, @Param("to") Instant to);
}
