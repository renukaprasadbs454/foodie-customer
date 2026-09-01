package com.foodie.shared.event;

import com.foodie.common.enums.OrderStatus;
import java.time.Instant;
import java.util.UUID;

public record OrderStatusChangedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID orderId,
        OrderStatus fromStatus,
        OrderStatus toStatus
) implements DomainEvent {

    public static OrderStatusChangedEvent of(UUID orderId, OrderStatus from, OrderStatus to) {
        return new OrderStatusChangedEvent(UUID.randomUUID(), Instant.now(), orderId, from, to);
    }
}
