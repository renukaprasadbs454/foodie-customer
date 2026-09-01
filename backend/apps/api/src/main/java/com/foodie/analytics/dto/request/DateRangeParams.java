package com.foodie.analytics.dto.request;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * Inclusive calendar-date range in UTC (API Contracts MODULE 14: ISO date query params).
 */
public record DateRangeParams(LocalDate dateFrom, LocalDate dateTo) {

    public Instant fromInclusive() {
        return dateFrom.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    /** Exclusive end instant (start of the day after dateTo). */
    public Instant toExclusive() {
        return dateTo.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    }
}
