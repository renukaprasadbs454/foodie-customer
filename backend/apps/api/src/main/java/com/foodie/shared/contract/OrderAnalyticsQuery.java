package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Order-owned read projections for Analytics (Phase3 §2.14 / §3.9).
 * Analytics must use this — never Order repositories directly.
 */
public interface OrderAnalyticsQuery {

    long countPlacedBetween(Instant fromInclusive, Instant toExclusive);

    long countDistinctRestaurantsWithOrdersBetween(Instant fromInclusive, Instant toExclusive);

    long countDistinctPartnersWithOrdersBetween(Instant fromInclusive, Instant toExclusive);

    List<StatusCountRow> countByStatusPlacedBetween(Instant fromInclusive, Instant toExclusive);

    List<DailySalesRow> dailySalesByPlacedAt(Instant fromInclusive, Instant toExclusive);

    record StatusCountRow(String status, long count) {
    }

    record DailySalesRow(LocalDate date, long orderCount, BigDecimal revenue) {
    }
}
