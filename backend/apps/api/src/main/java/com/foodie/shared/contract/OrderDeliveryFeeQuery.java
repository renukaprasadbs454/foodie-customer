package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Narrow read for Wallet driver-earnings credit amount (Phase3 §2.9).
 * Order owns delivery_fee; Wallet must not read Order tables directly.
 */
public interface OrderDeliveryFeeQuery {

    Optional<BigDecimal> findDeliveryFeeByOrderId(UUID orderId);
}
