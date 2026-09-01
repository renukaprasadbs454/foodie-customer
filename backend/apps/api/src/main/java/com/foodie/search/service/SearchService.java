package com.foodie.search.service;

import com.foodie.menu.dto.response.MenuItemResponseDto;
import com.foodie.search.dto.response.GlobalSearchResponseDto;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface SearchService {

    List<MenuItemResponseDto> searchFoodItems(String query, Boolean isVeg, BigDecimal maxPrice, UUID restaurantId);

    GlobalSearchResponseDto searchGlobal(String query, Double lat, Double lng);
}
