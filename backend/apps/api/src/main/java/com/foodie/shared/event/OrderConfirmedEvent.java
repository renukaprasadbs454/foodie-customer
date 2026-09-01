package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Published by Order on PLACED→CONFIRMED.
 * {@code couponId} is null when the order has no coupon; Coupon listens to finalize redemption.
 */
public record OrderConfirmedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId,
        UUID customerId,
        UUID couponId
) implements DomainEvent {

    public static OrderConfirmedEvent of(UUID orderId, UUID customerId, UUID couponId) {
        return new OrderConfirmedEvent(UUID.randomUUID(), Instant.now(), orderId, customerId, couponId);
    }
}
