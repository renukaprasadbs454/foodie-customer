package com.foodie.cart.service;

import com.foodie.cart.dto.request.AddCartItemRequestDto;
import com.foodie.cart.dto.request.UpdateCartItemQuantityRequestDto;
import com.foodie.cart.dto.response.CartResponseDto;
import java.util.UUID;

public interface CartService {

    CartResponseDto getOrCreate(UUID userCredentialId);

    CartResponseDto addItem(UUID userCredentialId, AddCartItemRequestDto request);

    CartResponseDto updateItemQuantity(UUID userCredentialId, UUID cartItemId, UpdateCartItemQuantityRequestDto request);

    CartResponseDto removeItem(UUID userCredentialId, UUID cartItemId);

    void clear(UUID userCredentialId);
}
