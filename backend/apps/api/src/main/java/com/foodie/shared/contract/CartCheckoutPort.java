package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Sole legal way Order snapshots / clears a cart (Phase3 §2.5–§2.6).
 */
public interface CartCheckoutPort {

    CartCheckoutSnapshot getCheckoutSnapshot(UUID userCredentialId);

    void clearCart(UUID userCredentialId);

    record CartCheckoutSnapshot(
            UUID cartId,
            UUID restaurantId,
            List<Line> items,
            BigDecimal subtotal
    ) {
    }

    record Line(
            UUID menuItemId,
            UUID variantId,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal
    ) {
    }
}
