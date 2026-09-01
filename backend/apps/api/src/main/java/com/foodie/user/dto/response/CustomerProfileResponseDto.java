package com.foodie.user.dto.response;

import java.util.UUID;

public record CustomerProfileResponseDto(
        UUID customerId,
        String fullName,
        String email,
        String phoneNumber,
        UUID defaultAddressId
) {
}
