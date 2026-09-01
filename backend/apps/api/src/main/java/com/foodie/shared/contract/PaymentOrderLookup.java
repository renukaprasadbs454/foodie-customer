package com.foodie.shared.contract;

import java.util.Optional;
import java.util.UUID;

/** Narrow Payment → Order id lookup for Notification refund messaging. */
public interface PaymentOrderLookup {

    Optional<UUID> findOrderIdByPaymentId(UUID paymentId);
}
