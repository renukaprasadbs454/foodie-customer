package com.foodie.admin.dto.response;

import java.math.BigDecimal;

public record PaymentSplitBreakdownDto(
        BigDecimal totalPaid,
        BigDecimal foodSubtotal,
        BigDecimal deliveryFee,
        BigDecimal platformFee,
        BigDecimal adminFoodCommission,
        BigDecimal adminDeliveryCommission,
        BigDecimal adminTotalRevenue,
        BigDecimal restaurantNetShare,
        BigDecimal deliveryPartnerNetShare
) {
}
