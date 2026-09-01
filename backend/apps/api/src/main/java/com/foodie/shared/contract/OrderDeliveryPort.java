package com.foodie.shared.contract;

import com.foodie.common.enums.OrderStatus;
import java.util.Optional;
import java.util.UUID;

/**
 * Sole legal way Delivery drives order delivery transitions (Phase3 §2.8 / §10.7–§10.9).
 */
public interface OrderDeliveryPort {

    Optional<OrderDeliverySnapshot> findByOrderId(UUID orderId);

    void assignPartner(UUID orderId, UUID deliveryPartnerId);

    void markPickedUpAndOutForDelivery(UUID orderId);

    void markDelivered(UUID orderId);

    record OrderDeliverySnapshot(
            UUID orderId,
            UUID restaurantId,
            OrderStatus status,
            UUID deliveryPartnerId
    ) {
    }
}
