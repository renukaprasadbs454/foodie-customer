package com.foodie.restaurant.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateRestaurantLocationRequestDto(
        @NotNull
        @DecimalMin("-90.0")
        @DecimalMax("90.0")
        BigDecimal latitude,

        @NotNull
        @DecimalMin("-180.0")
        @DecimalMax("180.0")
        BigDecimal longitude,

        @NotBlank
        @Size(max = 255)
        @JsonAlias({"line1", "addressLine1"})
        String addressLine1,

        @Size(max = 255)
        @JsonAlias({"line2", "addressLine2"})
        String addressLine2,

        @Size(max = 255)
        String landmark,

        @NotBlank
        @Size(max = 100)
        String city,

        @NotBlank
        @Size(max = 100)
        String state,

        @NotBlank
        @Size(max = 100)
        String country,

        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "pincode must be 6 digits")
        String pincode,

        @Size(max = 500)
        String formattedAddress
) {
}
