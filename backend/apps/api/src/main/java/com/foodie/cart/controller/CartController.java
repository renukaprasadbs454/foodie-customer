package com.foodie.cart.controller;

import com.foodie.cart.dto.request.AddCartItemRequestDto;
import com.foodie.cart.dto.request.UpdateCartItemQuantityRequestDto;
import com.foodie.cart.dto.response.CartResponseDto;
import com.foodie.cart.service.CartService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cart")
@Tag(name = "Cart")
@PreAuthorize("hasRole('CUSTOMER')")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    @Operation(summary = "Get my cart (get-or-create)")
    public ResponseEntity<ApiResponse<CartResponseDto>> getCart(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(cartService.getOrCreate(principal.userId())));
    }

    @PostMapping("/items")
    @Operation(summary = "Add item to cart (upserts quantity for same menu item + variant)")
    public ResponseEntity<ApiResponse<CartResponseDto>> addItem(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody AddCartItemRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(cartService.addItem(principal.userId(), request)));
    }

    @PutMapping("/items/{cartItemId}")
    @Operation(summary = "Update line item quantity in cart")
    public ResponseEntity<ApiResponse<CartResponseDto>> updateItemQuantity(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID cartItemId,
            @Valid @RequestBody UpdateCartItemQuantityRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(cartService.updateItemQuantity(principal.userId(), cartItemId, request)));
    }

    @DeleteMapping("/items/{cartItemId}")
    @Operation(summary = "Remove a cart line item")
    public ResponseEntity<ApiResponse<CartResponseDto>> removeItem(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID cartItemId
    ) {
        return ResponseEntity.ok(ApiResponse.success(cartService.removeItem(principal.userId(), cartItemId)));
    }

    @DeleteMapping
    @Operation(summary = "Clear my cart")
    public ResponseEntity<ApiResponse<Void>> clearCart(@AuthenticationPrincipal AuthPrincipal principal) {
        cartService.clear(principal.userId());
        return ResponseEntity.status(HttpStatus.NO_CONTENT).body(ApiResponse.success(null));
    }
}
