package com.foodie.menu.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record VariantResponseDto(
        UUID variantId,
        String name,
        BigDecimal priceDelta
) {
}
