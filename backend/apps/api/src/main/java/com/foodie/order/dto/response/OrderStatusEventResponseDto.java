package com.foodie.order.dto.response;

import com.foodie.common.enums.OrderActorType;
import com.foodie.common.enums.OrderStatus;
import java.time.Instant;
import java.util.UUID;

public record OrderStatusEventResponseDto(
        UUID eventId,
        OrderStatus fromStatus,
        OrderStatus toStatus,
        OrderActorType actorType,
        UUID actorId,
        String reason,
        Instant createdAt
) {
}
