package com.foodie.restaurant.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RestaurantUpiRequestDto(
        @NotBlank(message = "UPI ID is required")
        @Size(max = 100, message = "UPI ID must not exceed 100 characters")
        @Pattern(regexp = "^[a-zA-Z0-9.\\-_]{2,256}@[a-zA-Z]{2,64}$", message = "Invalid UPI ID format")
        String upiId,

        @NotBlank(message = "UPI account holder name is required")
        @Size(max = 150, message = "UPI account holder name must not exceed 150 characters")
        String upiName
) {}
