package com.foodie.menu.dto.response;

import java.time.Instant;

public record MenuImageUploadResponseDto(
        String fileKey,
        Instant uploadedAt
) {
}
