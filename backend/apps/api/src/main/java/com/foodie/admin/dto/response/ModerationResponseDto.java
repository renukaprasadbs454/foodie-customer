package com.foodie.admin.dto.response;

import java.util.UUID;

public record ModerationResponseDto(
        UUID reviewId,
        boolean flagged
) {
}
