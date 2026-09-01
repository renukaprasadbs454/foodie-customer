package com.foodie.shared.contract;

import com.foodie.common.enums.OrderStatus;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Sole legal way Payment reads order payability fields (Phase3 §2.7).
 */
public interface OrderPaymentPort {

    Optional<PayableOrder> findByOrderId(UUID orderId);

    record PayableOrder(
            UUID orderId,
            UUID customerId,
            OrderStatus status,
            BigDecimal totalAmount
    ) {
    }
}
