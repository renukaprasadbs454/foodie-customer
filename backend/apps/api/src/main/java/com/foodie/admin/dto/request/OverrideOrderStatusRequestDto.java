package com.foodie.admin.dto.request;

import com.foodie.common.enums.OrderStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OverrideOrderStatusRequestDto(
        @NotNull OrderStatus targetStatus,
        @NotBlank @Size(max = 500) String reason
) {
}
