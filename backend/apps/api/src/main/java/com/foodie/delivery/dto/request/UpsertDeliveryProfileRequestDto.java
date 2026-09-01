package com.foodie.delivery.dto.request;

import com.foodie.common.enums.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpsertDeliveryProfileRequestDto(
        @NotBlank
        @Size(max = 255)
        String fullName,

        @NotNull
        VehicleType vehicleType,

        @Size(max = 20)
        String vehicleNumber
) {
}
