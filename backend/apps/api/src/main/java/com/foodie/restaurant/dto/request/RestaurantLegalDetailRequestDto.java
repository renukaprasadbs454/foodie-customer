package com.foodie.restaurant.dto.request;

import com.foodie.common.enums.RestaurantBusinessType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RestaurantLegalDetailRequestDto(
        @Size(max = 20, message = "GSTIN must not exceed 20 characters")
        @Pattern(regexp = "^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", message = "Invalid GSTIN format")
        String gstin,

        @Size(max = 20, message = "PAN must not exceed 20 characters")
        @Pattern(regexp = "^$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$", message = "Invalid PAN format")
        String pan,

        @Size(max = 30, message = "FSSAI license number must not exceed 30 characters")
        String fssaiLicenseNumber,

        @NotBlank(message = "Legal name is required")
        @Size(max = 255, message = "Legal name must not exceed 255 characters")
        String legalName,

        @NotNull(message = "Business type is required")
        RestaurantBusinessType businessType,

        @NotBlank(message = "Contact email is required")
        @Email(message = "Invalid contact email format")
        String contactEmail,

        @NotBlank(message = "Contact phone is required")
        @Pattern(regexp = "^\\+?[0-9\\s\\-]{10,20}$", message = "Invalid contact phone number format")
        String contactPhone
) {}
