package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Payment-owned read projections for Analytics (Phase3 §2.14).
 */
public interface PaymentAnalyticsQuery {

    /** Sum of CAPTURED payment.amount with captured_at in [from, to). */
    BigDecimal sumCapturedBetween(Instant fromInclusive, Instant toExclusive);
}
