package com.foodie.delivery.dto.response;

import com.foodie.delivery.dto.response.DeliveryDocumentResponseDto;
import java.util.List;
import java.util.UUID;

public record DeliveryProfileResponseDto(
                UUID partnerId,
                String fullName,
                String vehicleType,
                String vehicleNumber,
                String kycStatus,
                boolean isOnline,
                String profileImageUrl,
                List<DeliveryDocumentResponseDto> documents) {
}
