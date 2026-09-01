package com.foodie.search.service.impl;

import com.foodie.infrastructure.storage.ObjectStorageClient;
import com.foodie.menu.dto.response.MenuItemResponseDto;
import com.foodie.menu.dto.response.VariantResponseDto;
import com.foodie.menu.entity.MenuItem;
import com.foodie.menu.mapper.MenuMapper;
import com.foodie.menu.repository.MenuItemRepository;
import com.foodie.menu.repository.VariantRepository;
import com.foodie.restaurant.dto.response.RestaurantSummaryResponseDto;
import com.foodie.restaurant.service.RestaurantService;
import com.foodie.search.dto.response.GlobalSearchResponseDto;
import com.foodie.search.service.SearchService;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SearchServiceImpl implements SearchService {

    private static final Duration SIGNED_URL_TTL = Duration.ofMinutes(15);

    private final MenuItemRepository menuItemRepository;
    private final VariantRepository variantRepository;
    private final MenuMapper menuMapper;
    private final RestaurantService restaurantService;
    private final ObjectStorageClient objectStorageClient;

    public SearchServiceImpl(
            MenuItemRepository menuItemRepository,
            VariantRepository variantRepository,
            MenuMapper menuMapper,
            RestaurantService restaurantService,
            ObjectStorageClient objectStorageClient
    ) {
        this.menuItemRepository = menuItemRepository;
        this.variantRepository = variantRepository;
        this.menuMapper = menuMapper;
        this.restaurantService = restaurantService;
        this.objectStorageClient = objectStorageClient;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MenuItemResponseDto> searchFoodItems(String query, Boolean isVeg, BigDecimal maxPrice, UUID restaurantId) {
        List<MenuItem> items;
        if (query != null && !query.isBlank()) {
            items = menuItemRepository.findByNameContainingIgnoreCase(query.trim());
        } else if (restaurantId != null) {
            items = menuItemRepository.findByRestaurantIdOrderByCreatedAtAsc(restaurantId);
        } else {
            items = menuItemRepository.findAll();
        }

        return items.stream()
                .filter(MenuItem::isAvailable)
                .filter(item -> restaurantId == null || item.getRestaurantId().equals(restaurantId))
                .filter(item -> isVeg == null || item.isVeg() == isVeg)
                .filter(item -> maxPrice == null || item.getBasePrice().compareTo(maxPrice) <= 0)
                .map(this::mapToItemDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GlobalSearchResponseDto searchGlobal(String query, Double lat, Double lng) {
        List<RestaurantSummaryResponseDto> restaurants = restaurantService.search(query, null, null, lat, lng, 0, 10, null).items();
        List<MenuItemResponseDto> foodItems = searchFoodItems(query, null, null, null);
        return new GlobalSearchResponseDto(restaurants, foodItems);
    }

    private MenuItemResponseDto mapToItemDto(MenuItem item) {
        String imageUrl = signedOrNull(item.getImageS3Key());
        return menuMapper.toMenuItem(item, imageUrl);
    }

    private String signedOrNull(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        return objectStorageClient.createSignedGetUrl(key, SIGNED_URL_TTL);
    }
}
