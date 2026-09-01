package com.foodie.coupon.mapper;

import com.foodie.coupon.dto.response.ApplyCouponResponseDto;
import com.foodie.coupon.dto.response.CouponResponseDto;
import com.foodie.coupon.dto.response.EligibleCouponResponseDto;
import com.foodie.coupon.entity.Coupon;
import com.foodie.shared.contract.CouponService;
import java.math.BigDecimal;

public final class CouponMapper {

    private CouponMapper() {
    }

    public static CouponService.CouponView toView(Coupon coupon) {
        return new CouponService.CouponView(
                coupon.getCode(),
                coupon.getDiscountType().name(),
                coupon.getValue(),
                coupon.getMinOrderAmount(),
                coupon.getMaxDiscountAmount(),
                coupon.getExpiryDate()
        );
    }

    public static EligibleCouponResponseDto toEligibleDto(CouponService.CouponView view) {
        return new EligibleCouponResponseDto(
                view.code(),
                view.discountType(),
                view.value(),
                view.minOrderAmount(),
                view.maxDiscountAmount(),
                view.expiryDate()
        );
    }

    public static ApplyCouponResponseDto toApplyDto(CouponService.DiscountResult result) {
        return new ApplyCouponResponseDto(result.code(), result.discountAmount(), result.finalTotal());
    }

    public static CouponResponseDto toResponse(Coupon coupon) {
        return new CouponResponseDto(
                coupon.getId(),
                coupon.getCode(),
                coupon.getDiscountType().name(),
                coupon.getValue(),
                coupon.getMinOrderAmount(),
                coupon.getMaxDiscountAmount(),
                coupon.getExpiryDate(),
                coupon.getUsageLimitTotal(),
                coupon.getUsageLimitPerUser(),
                coupon.getRestaurantId(),
                coupon.isActive()
        );
    }

    public static BigDecimal scaleMoney(BigDecimal amount) {
        return amount.setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
