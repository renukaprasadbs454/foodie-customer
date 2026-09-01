package com.foodie.admin.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentSettlementResponseDto(
        UUID id,
        UUID paymentUuid,
        String orderId,
        String customerName,
        String paymentMethod,
        BigDecimal totalPaid,
        BigDecimal foodSubtotal,
        BigDecimal deliveryFee,
        BigDecimal adminTotalRevenue,
        BigDecimal restaurantNetShare,
        String restaurantName,
        BigDecimal deliveryPartnerNetShare,
        String driverName,
        String settlementStatus,
        Instant settledAt
) {
}
