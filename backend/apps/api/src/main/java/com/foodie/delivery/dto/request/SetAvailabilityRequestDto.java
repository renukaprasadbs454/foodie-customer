package com.foodie.delivery.dto.request;

import jakarta.validation.constraints.NotNull;

public record SetAvailabilityRequestDto(
        @NotNull
        Boolean isOnline
) {
}
