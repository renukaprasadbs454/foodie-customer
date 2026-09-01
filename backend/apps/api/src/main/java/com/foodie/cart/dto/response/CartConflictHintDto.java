package com.foodie.cart.dto.response;

/**
 * Payload on 409 CART_RESTAURANT_CONFLICT (API Contracts §5.2).
 */
public record CartConflictHintDto(String suggestedAction) {

    public static CartConflictHintDto clearCart() {
        return new CartConflictHintDto("CLEAR_CART");
    }
}
