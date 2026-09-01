package com.foodie.delivery.dto.response;

import java.time.Instant;
import java.util.UUID;

public record DeliveryAssignmentResponseDto(
        UUID assignmentId,
        UUID orderId,
        String status,
        boolean pickupOtpRequired,
        Instant assignedAt,
        Instant pickupVerifiedAt,
        Instant deliveredVerifiedAt
) {
}
