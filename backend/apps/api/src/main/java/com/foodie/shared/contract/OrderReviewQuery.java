package com.foodie.shared.contract;

import com.foodie.common.enums.OrderStatus;
import java.util.Optional;
import java.util.UUID;

/**
 * Narrow Order read for Review eligibility (Phase3 §2.11).
 * Review must never read Order tables directly.
 */
public interface OrderReviewQuery {

    Optional<OrderReviewSnapshot> findByOrderId(UUID orderId);

    record OrderReviewSnapshot(
            UUID orderId,
            UUID customerId,
            UUID restaurantId,
            UUID deliveryPartnerId,
            OrderStatus status
    ) {
    }
}
