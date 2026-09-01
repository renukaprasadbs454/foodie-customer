package com.foodie.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateAddressRequestDto(
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

        BigDecimal latitude,

        BigDecimal longitude
) {
}
