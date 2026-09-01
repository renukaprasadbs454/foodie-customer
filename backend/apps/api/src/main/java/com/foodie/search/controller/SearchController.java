package com.foodie.search.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.menu.dto.response.MenuItemResponseDto;
import com.foodie.search.dto.response.GlobalSearchResponseDto;
import com.foodie.search.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/food-items")
    @Operation(summary = "Search food items by keyword, veg/non-veg, price range, or restaurant (public)")
    public ResponseEntity<ApiResponse<List<MenuItemResponseDto>>> searchFoodItems(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Boolean isVeg,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) UUID restaurantId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                searchService.searchFoodItems(query, isVeg, maxPrice, restaurantId)));
    }

    @GetMapping("/global")
    @Operation(summary = "Unified search returning matching restaurants and food items for search bar (public)")
    public ResponseEntity<ApiResponse<GlobalSearchResponseDto>> searchGlobal(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                searchService.searchGlobal(query, lat, lng)));
    }
}
