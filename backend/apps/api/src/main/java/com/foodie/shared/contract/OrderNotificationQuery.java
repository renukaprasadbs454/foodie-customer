package com.foodie.shared.contract;

import com.foodie.common.enums.OrderStatus;
import java.util.Optional;
import java.util.UUID;

/**
 * Narrow Order read for Notification recipient resolution (Phase3 §2.10).
 * Notification must never read Order tables directly.
 */
public interface OrderNotificationQuery {

    Optional<OrderNotifySnapshot> findByOrderId(UUID orderId);

    record OrderNotifySnapshot(
            UUID orderId,
            String orderNumber,
            UUID customerId,
            UUID restaurantId,
            UUID deliveryPartnerId,
            OrderStatus status
    ) {
    }
}
