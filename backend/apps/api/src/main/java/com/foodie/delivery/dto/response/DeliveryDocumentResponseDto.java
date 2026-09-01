package com.foodie.delivery.dto.response;

import java.time.Instant;
import java.util.UUID;

public record DeliveryDocumentResponseDto(
        UUID documentId,
        String docType,
        String verificationStatus,
        String fileKey,
        Instant uploadedAt
) {
}
