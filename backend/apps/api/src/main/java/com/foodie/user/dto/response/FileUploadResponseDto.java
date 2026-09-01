package com.foodie.user.dto.response;

import java.time.Instant;

public record FileUploadResponseDto(
        String fileKey,
        Instant uploadedAt
) {
}
