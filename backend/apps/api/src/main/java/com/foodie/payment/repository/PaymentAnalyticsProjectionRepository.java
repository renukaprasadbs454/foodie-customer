package com.foodie.payment.repository;

import com.foodie.payment.entity.Payment;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Read-only analytics projections owned by Payment (Phase3 §2.14).
 */
public interface PaymentAnalyticsProjectionRepository extends JpaRepository<Payment, UUID> {

    @Query("""
            select coalesce(sum(p.amount), 0) from Payment p
            where p.status = com.foodie.common.enums.PaymentStatus.CAPTURED
              and p.capturedAt >= :from and p.capturedAt < :to
            """)
    BigDecimal sumCapturedBetween(@Param("from") Instant from, @Param("to") Instant to);
}
