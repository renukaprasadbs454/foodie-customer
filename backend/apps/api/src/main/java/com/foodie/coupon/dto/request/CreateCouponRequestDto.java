package com.foodie.coupon.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.coupon.entity.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Admin create body (API Contracts MODULE 13.4). Unknown fields → 400 UNKNOWN_FIELD.
 */
public class CreateCouponRequestDto {

    @NotBlank
    @Pattern(regexp = "^[A-Z0-9_]{3,30}$", message = "must match ^[A-Z0-9_]{3,30}$")
    private String code;

    @NotNull
    private DiscountType discountType;

    @NotNull
    @DecimalMin(value = "0.01", inclusive = true)
    private BigDecimal value;

    @NotNull
    @DecimalMin(value = "0.00", inclusive = true)
    private BigDecimal minOrderAmount;

    private BigDecimal maxDiscountAmount;

    @NotNull
    @Future(message = "must be a future date")
    private LocalDate expiryDate;

    @Min(1)
    private Integer usageLimitTotal;

    @NotNull
    @Min(1)
    private Integer usageLimitPerUser;

    private UUID restaurantId;

    public CreateCouponRequestDto() {
    }

    public CreateCouponRequestDto(
            String code,
            DiscountType discountType,
            BigDecimal value,
            BigDecimal minOrderAmount,
            BigDecimal maxDiscountAmount,
            LocalDate expiryDate,
            Integer usageLimitTotal,
            Integer usageLimitPerUser,
            UUID restaurantId
    ) {
        this.code = code;
        this.discountType = discountType;
        this.value = value;
        this.minOrderAmount = minOrderAmount;
        this.maxDiscountAmount = maxDiscountAmount;
        this.expiryDate = expiryDate;
        this.usageLimitTotal = usageLimitTotal;
        this.usageLimitPerUser = usageLimitPerUser;
        this.restaurantId = restaurantId;
    }

    @JsonAnySetter
    public void rejectUnknown(String name, Object value) {
        throw new BadRequestException(ErrorCode.UNKNOWN_FIELD, "Unknown field: " + name);
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public DiscountType getDiscountType() {
        return discountType;
    }

    public void setDiscountType(DiscountType discountType) {
        this.discountType = discountType;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public BigDecimal getMinOrderAmount() {
        return minOrderAmount;
    }

    public void setMinOrderAmount(BigDecimal minOrderAmount) {
        this.minOrderAmount = minOrderAmount;
    }

    public BigDecimal getMaxDiscountAmount() {
        return maxDiscountAmount;
    }

    public void setMaxDiscountAmount(BigDecimal maxDiscountAmount) {
        this.maxDiscountAmount = maxDiscountAmount;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public Integer getUsageLimitTotal() {
        return usageLimitTotal;
    }

    public void setUsageLimitTotal(Integer usageLimitTotal) {
        this.usageLimitTotal = usageLimitTotal;
    }

    public Integer getUsageLimitPerUser() {
        return usageLimitPerUser;
    }

    public void setUsageLimitPerUser(Integer usageLimitPerUser) {
        this.usageLimitPerUser = usageLimitPerUser;
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }

    public void setRestaurantId(UUID restaurantId) {
        this.restaurantId = restaurantId;
    }
}
