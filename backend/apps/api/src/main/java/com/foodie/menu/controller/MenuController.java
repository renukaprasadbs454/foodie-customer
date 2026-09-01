package com.foodie.menu.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.menu.dto.request.CreateCategoryRequestDto;
import com.foodie.menu.dto.request.CreateMenuItemRequestDto;
import com.foodie.menu.dto.request.CreateVariantRequestDto;
import com.foodie.menu.dto.request.UpdateAvailabilityRequestDto;
import com.foodie.menu.dto.request.UpdateCategoryRequestDto;
import com.foodie.menu.dto.request.UpdateMenuItemRequestDto;
import com.foodie.menu.dto.response.AvailabilityResponseDto;
import com.foodie.menu.dto.response.CategoryResponseDto;
import com.foodie.menu.dto.response.FullMenuResponseDto;
import com.foodie.menu.dto.response.MenuImageUploadResponseDto;
import com.foodie.menu.dto.response.MenuItemResponseDto;
import com.foodie.menu.dto.response.VariantResponseDto;
import com.foodie.menu.service.MenuService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/menu")
@Tag(name = "Menu")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping("/restaurants/{restaurantId}")
    @Operation(summary = "Get full menu for a restaurant (public)")
    public ResponseEntity<ApiResponse<FullMenuResponseDto>> getFullMenu(@PathVariable UUID restaurantId) {
        return ResponseEntity.ok(ApiResponse.success(menuService.getFullMenu(restaurantId)));
    }

    @GetMapping("/items/{itemId}")
    @Operation(summary = "Get individual food item details (public)")
    public ResponseEntity<ApiResponse<MenuItemResponseDto>> getItemById(@PathVariable UUID itemId) {
        return ResponseEntity.ok(ApiResponse.success(menuService.getItemById(itemId)));
    }

    @GetMapping("/restaurants/{restaurantId}/items")
    @Operation(summary = "Get food items for a restaurant with category/veg filter (public)")
    public ResponseEntity<ApiResponse<List<MenuItemResponseDto>>> getItemsByRestaurant(
            @PathVariable UUID restaurantId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Boolean isVeg
    ) {
        return ResponseEntity.ok(ApiResponse.success(menuService.getItemsByRestaurant(restaurantId, categoryId, isVeg)));
    }

    @GetMapping("/categories")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "List menu categories for my restaurant")
    public ResponseEntity<ApiResponse<List<CategoryResponseDto>>> getCategories(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(menuService.getCategories(principal.userId())));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Create a menu category for my restaurant")
    public ResponseEntity<ApiResponse<CategoryResponseDto>> createCategory(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CreateCategoryRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(menuService.createCategory(principal.userId(), request)));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Update a menu category")
    public ResponseEntity<ApiResponse<CategoryResponseDto>> updateCategory(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCategoryRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(menuService.updateCategory(principal.userId(), id, request)));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Delete a menu category")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id
    ) {
        menuService.deleteCategory(principal.userId(), id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).body(ApiResponse.success(null));
    }

    @PostMapping("/items")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Create a menu item")
    public ResponseEntity<ApiResponse<MenuItemResponseDto>> createItem(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CreateMenuItemRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(menuService.createItem(principal.userId(), request)));
    }

    @PutMapping("/items/{id}")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Update a menu item")
    public ResponseEntity<ApiResponse<MenuItemResponseDto>> updateItem(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateMenuItemRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(menuService.updateItem(principal.userId(), id, request)));
    }

    @DeleteMapping("/items/{id}")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Delete a menu item")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id
    ) {
        menuService.deleteItem(principal.userId(), id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).body(ApiResponse.success(null));
    }

    @PatchMapping("/items/{id}/availability")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Update menu item availability")
    public ResponseEntity<ApiResponse<AvailabilityResponseDto>> updateAvailability(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAvailabilityRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                menuService.updateAvailability(principal.userId(), id, request)));
    }

    @PostMapping("/items/{itemId}/variants")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Add a variant to a menu item")
    public ResponseEntity<ApiResponse<VariantResponseDto>> addVariant(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID itemId,
            @Valid @RequestBody CreateVariantRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(menuService.addVariant(principal.userId(), itemId, request)));
    }

    @PostMapping(value = "/items/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Upload menu item image")
    public ResponseEntity<ApiResponse<MenuImageUploadResponseDto>> uploadImage(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(menuService.uploadItemImage(principal.userId(), id, file)));
    }
}
