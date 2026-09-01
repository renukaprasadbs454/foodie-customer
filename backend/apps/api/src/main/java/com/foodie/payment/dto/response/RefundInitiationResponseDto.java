package com.foodie.payment.dto.response;

import com.foodie.common.enums.RefundStatus;
import java.util.UUID;

public record RefundInitiationResponseDto(
        UUID refundRequestId,
        RefundStatus status
) {
}
