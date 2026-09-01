package com.foodie.shared.contract;

import java.time.Instant;

/**
 * User/Customer-owned read projections for Analytics (Phase3 §2.14).
 */
public interface CustomerAnalyticsQuery {

    long countCreatedBetween(Instant fromInclusive, Instant toExclusive);
}
