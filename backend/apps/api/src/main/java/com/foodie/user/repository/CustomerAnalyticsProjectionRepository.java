package com.foodie.user.repository;

import com.foodie.user.entity.Customer;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Read-only analytics projections owned by User/Customer (Phase3 §2.14).
 */
public interface CustomerAnalyticsProjectionRepository extends JpaRepository<Customer, UUID> {

    @Query("""
            select count(c) from Customer c
            where c.createdAt >= :from and c.createdAt < :to
            """)
    long countCreatedBetween(@Param("from") Instant from, @Param("to") Instant to);
}
