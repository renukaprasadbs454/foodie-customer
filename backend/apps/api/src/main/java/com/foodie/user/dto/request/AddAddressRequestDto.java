package com.foodie.user.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record AddAddressRequestDto(
        @Size(max = 100)
        String recipientName,

        @Size(max = 20)
        String recipientPhone,

        @Size(max = 100)
        String houseFlatNo,

        @Size(max = 255)
        String landmark,

        @Size(max = 100)
        String state,

        @Size(max = 50)
        String label,

        @NotBlank
        @Size(max = 255)
        String line1,

        @Size(max = 255)
        String line2,

        @NotBlank
        @Size(max = 100)
        String city,

        @NotBlank
        String pincode,

        @NotNull
        @DecimalMin(value = "-90.0")
        @DecimalMax(value = "90.0")
        BigDecimal latitude,

        @NotNull
        @DecimalMin(value = "-180.0")
        @DecimalMax(value = "180.0")
        BigDecimal longitude,

        Boolean isDefault
) {
    public boolean defaultFlag() {
        return Boolean.TRUE.equals(isDefault);
    }
}
