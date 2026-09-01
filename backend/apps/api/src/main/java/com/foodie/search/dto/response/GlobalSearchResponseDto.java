package com.foodie.search.dto.response;

import com.foodie.menu.dto.response.MenuItemResponseDto;
import com.foodie.restaurant.dto.response.RestaurantSummaryResponseDto;
import java.util.List;

public record GlobalSearchResponseDto(
        List<RestaurantSummaryResponseDto> restaurants,
        List<MenuItemResponseDto> foodItems
) {
}
