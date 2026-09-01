package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Published by Payment after Razorpay capture; Order transitions PLACED→CONFIRMED (Phase3 §10.5).
 * Defined here so Order can listen before the Payment module lands.
 */
public record PaymentCapturedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId,
        UUID paymentId
) implements DomainEvent {

    public static PaymentCapturedEvent of(UUID orderId, UUID paymentId) {
        return new PaymentCapturedEvent(UUID.randomUUID(), Instant.now(), orderId, paymentId);
    }
}
