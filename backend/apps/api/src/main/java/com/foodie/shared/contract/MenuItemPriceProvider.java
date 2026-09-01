package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Sole legal way Cart/Order read a live menu price (Phase3 §2.4).
 */
public interface MenuItemPriceProvider {

    Optional<MenuItemPriceSnapshot> getPriceSnapshot(UUID menuItemId, UUID variantId);

    record MenuItemPriceSnapshot(
            UUID menuItemId,
            UUID variantId,
            UUID restaurantId,
            BigDecimal unitPrice,
            boolean available,
            String itemName
    ) {
    }
}
