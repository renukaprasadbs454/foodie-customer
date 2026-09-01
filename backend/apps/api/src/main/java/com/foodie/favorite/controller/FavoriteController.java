package com.foodie.favorite.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.favorite.service.FavoriteService;
import com.foodie.restaurant.dto.response.RestaurantSummaryResponseDto;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/favorites")
@Tag(name = "Favorite")
@PreAuthorize("hasRole('CUSTOMER')")
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @PostMapping("/restaurants/{restaurantId}")
    @Operation(summary = "Add restaurant to my favorites")
    public ResponseEntity<ApiResponse<Void>> addFavorite(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID restaurantId
    ) {
        favoriteService.addFavoriteRestaurant(principal.userId(), restaurantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(null));
    }

    @DeleteMapping("/restaurants/{restaurantId}")
    @Operation(summary = "Remove restaurant from my favorites")
    public ResponseEntity<ApiResponse<Void>> removeFavorite(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID restaurantId
    ) {
        favoriteService.removeFavoriteRestaurant(principal.userId(), restaurantId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).body(ApiResponse.success(null));
    }

    @GetMapping("/restaurants")
    @Operation(summary = "Get list of my favorite restaurants")
    public ResponseEntity<ApiResponse<List<RestaurantSummaryResponseDto>>> getFavorites(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                favoriteService.getFavoriteRestaurants(principal.userId())));
    }
}
