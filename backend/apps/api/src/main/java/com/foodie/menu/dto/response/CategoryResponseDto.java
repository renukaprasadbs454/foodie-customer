package com.foodie.menu.dto.response;

import java.util.UUID;

public record CategoryResponseDto(
        UUID categoryId,
        String name,
        int displayOrder
) {
}
