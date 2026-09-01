package com.foodie.coupon;

import static org.assertj.core.api.Assertions.assertThat;

import com.foodie.coupon.entity.Coupon;
import com.foodie.coupon.entity.DiscountType;
import com.foodie.coupon.service.impl.CouponServiceImpl;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class CouponDiscountMathTest {

    @Test
    void flatDoesNotExceedCartTotal() {
        Coupon coupon = Coupon.create(
                "BIG",
                DiscountType.FLAT,
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                null,
                Instant.now().plusSeconds(60),
                null,
                1,
                null
        );
        assertThat(CouponServiceImpl.computeDiscount(coupon, new BigDecimal("40.00")))
                .isEqualByComparingTo("40.00");
    }

    @Test
    void percentWithoutCap() {
        // maxDiscountAmount is required for PERCENT at create-time; math still respects null as uncapped.
        Coupon coupon = Coupon.create(
                "P10",
                DiscountType.PERCENT,
                new BigDecimal("10.00"),
                BigDecimal.ZERO,
                null,
                Instant.now().plusSeconds(60),
                null,
                1,
                null
        );
        assertThat(CouponServiceImpl.computeDiscount(coupon, new BigDecimal("250.00")))
                .isEqualByComparingTo("25.00");
    }
}
