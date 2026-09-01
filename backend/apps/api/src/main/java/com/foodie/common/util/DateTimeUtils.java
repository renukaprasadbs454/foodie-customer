package com.foodie.common.util;

import java.time.Instant;

public final class DateTimeUtils {

    private DateTimeUtils() {
    }

    public static Instant nowUtc() {
        return Instant.now();
    }
}
