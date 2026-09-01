package com.foodie.order.dto.request;

import com.foodie.common.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TransitionOrderStatusRequestDto(
        @NotNull OrderStatus targetStatus,
        @Size(max = 500) String reason
) {
}
