package com.foodie.menu.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.infrastructure.storage.ImageMagicBytes;
import com.foodie.infrastructure.storage.ObjectStorageClient;
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
import com.foodie.menu.entity.Category;
import com.foodie.menu.entity.MenuItem;
import com.foodie.menu.entity.Variant;
import com.foodie.menu.mapper.MenuMapper;
import com.foodie.menu.repository.CategoryRepository;
import com.foodie.menu.repository.MenuItemRepository;
import com.foodie.menu.repository.VariantRepository;
import com.foodie.menu.service.MenuCacheService;
import com.foodie.menu.service.MenuService;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import com.foodie.shared.event.MenuItemPriceChangedEvent;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MenuServiceImpl implements MenuService {

    private static final Logger log = LoggerFactory.getLogger(MenuServiceImpl.class);
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final Duration SIGNED_URL_TTL = Duration.ofMinutes(15);

    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final VariantRepository variantRepository;
    private final MenuMapper menuMapper;
    private final RestaurantSummaryProvider restaurantSummaryProvider;
    private final MenuCacheService menuCacheService;
    private final ObjectStorageClient objectStorageClient;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public MenuServiceImpl(
            CategoryRepository categoryRepository,
            MenuItemRepository menuItemRepository,
            VariantRepository variantRepository,
            MenuMapper menuMapper,
            RestaurantSummaryProvider restaurantSummaryProvider,
            MenuCacheService menuCacheService,
            ObjectStorageClient objectStorageClient,
            ApplicationEventPublisher eventPublisher,
            ObjectMapper objectMapper) {
        this.categoryRepository = categoryRepository;
        this.menuItemRepository = menuItemRepository;
        this.variantRepository = variantRepository;
        this.menuMapper = menuMapper;
        this.restaurantSummaryProvider = restaurantSummaryProvider;
        this.menuCacheService = menuCacheService;
        this.objectStorageClient = objectStorageClient;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public FullMenuResponseDto getFullMenu(UUID restaurantId) {
        UUID targetId = restaurantId;
        if (restaurantSummaryProvider.findByRestaurantId(targetId).isEmpty()) {
            List<Category> firstCats = categoryRepository.findAll();
            if (!firstCats.isEmpty()) {
                targetId = firstCats.get(0).getRestaurantId();
            }
        }
        final UUID activeRestaurantId = targetId;

        var cached = menuCacheService.get(activeRestaurantId);
        if (cached.isPresent()) {
            try {
                return objectMapper.readValue(cached.get(), FullMenuResponseDto.class);
            } catch (JsonProcessingException ex) {
                log.warn("Failed to deserialize menu cache for restaurant {}", activeRestaurantId, ex);
            }
        }

        List<Category> categories = categoryRepository.findByRestaurantIdOrderByDisplayOrderAsc(activeRestaurantId);
        List<MenuItem> items = menuItemRepository.findByRestaurantIdOrderByCreatedAtAsc(activeRestaurantId);
        Map<UUID, List<MenuItem>> itemsByCategory = items.stream()
                .collect(Collectors.groupingBy(MenuItem::getCategoryId, LinkedHashMap::new, Collectors.toList()));

        List<UUID> itemIds = items.stream().map(MenuItem::getId).toList();
        Map<UUID, List<Variant>> variantsByItem = itemIds.isEmpty()
                ? Map.of()
                : variantRepository.findByMenuItemIdInOrderByCreatedAtAsc(itemIds).stream()
                        .collect(
                                Collectors.groupingBy(Variant::getMenuItemId, LinkedHashMap::new, Collectors.toList()));

        List<FullMenuResponseDto.MenuCategoryDto> categoryDtos = new ArrayList<>();
        for (Category category : categories) {
            List<MenuItem> categoryItems = itemsByCategory.get(category.getId());
            List<FullMenuResponseDto.MenuItemDto> itemDtos = (categoryItems != null ? categoryItems
                    : List.<MenuItem>of())
                    .stream()
                    .map(item -> {
                        List<Variant> itemVariants = variantsByItem != null ? variantsByItem.get(item.getId()) : null;
                        List<VariantResponseDto> variantDtos = (itemVariants != null ? itemVariants
                                : List.<Variant>of())
                                .stream()
                                .map(menuMapper::toVariant)
                                .toList();
                        return menuMapper.toFullMenuItem(
                                item,
                                signedOrNull(item.getImageS3Key()),
                                variantDtos);
                    })
                    .toList();
            categoryDtos.add(menuMapper.toFullMenuCategory(category, itemDtos));
        }

        FullMenuResponseDto menu = new FullMenuResponseDto(activeRestaurantId, categoryDtos);
        try {
            menuCacheService.put(activeRestaurantId, objectMapper.writeValueAsString(menu));
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize full menu cache for restaurantId={}", activeRestaurantId, ex);
        }
        return menu;
    }

    @Override
    @Transactional(readOnly = true)
    public MenuItemResponseDto getItemById(UUID menuItemId) {
        MenuItem item = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Menu item not found with id: " + menuItemId));
        String imageUrl = signedOrNull(item.getImageS3Key());
        return menuMapper.toMenuItem(item, imageUrl);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MenuItemResponseDto> getItemsByRestaurant(UUID restaurantId, UUID categoryId, Boolean isVeg) {
        List<MenuItem> items;
        if (categoryId != null) {
            items = menuItemRepository.findByCategoryIdOrderByCreatedAtAsc(categoryId);
        } else {
            items = menuItemRepository.findByRestaurantIdOrderByCreatedAtAsc(restaurantId);
        }

        return items.stream()
                .filter(item -> isVeg == null || item.isVeg() == isVeg)
                .map(item -> menuMapper.toMenuItem(item, signedOrNull(item.getImageS3Key())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponseDto> getCategories(UUID ownerCredentialId) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        return categoryRepository.findByRestaurantIdOrderByDisplayOrderAsc(restaurantId).stream()
                .map(menuMapper::toCategory)
                .toList();
    }

    @Override
    @Transactional
    public CategoryResponseDto createCategory(UUID ownerCredentialId, CreateCategoryRequestDto request) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        Category category = categoryRepository.save(Category.create(
                restaurantId,
                request.name(),
                request.displayOrderOrDefault()));
        menuCacheService.evict(restaurantId);
        return menuMapper.toCategory(category);
    }

    @Override
    @Transactional
    public CategoryResponseDto updateCategory(UUID ownerCredentialId, UUID categoryId,
            UpdateCategoryRequestDto request) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        Category category = categoryRepository.findByIdAndRestaurantId(categoryId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found."));
        category.update(request.name(), request.displayOrder());
        menuCacheService.evict(restaurantId);
        return menuMapper.toCategory(category);
    }

    @Override
    @Transactional
    public void deleteCategory(UUID ownerCredentialId, UUID categoryId) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        Category category = categoryRepository.findByIdAndRestaurantId(categoryId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found."));
        category.softDelete();
        List<MenuItem> items = menuItemRepository.findByCategoryIdOrderByCreatedAtAsc(categoryId);
        for (MenuItem item : items) {
            item.softDelete();
            publishPriceChanged(restaurantId, item.getId());
        }
        menuCacheService.evict(restaurantId);
    }

    @Override
    @Transactional
    public MenuItemResponseDto createItem(UUID ownerCredentialId, CreateMenuItemRequestDto request) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        Category category = categoryRepository.findByIdAndRestaurantId(request.categoryId(), restaurantId)
                .orElseThrow(() -> new UnprocessableEntityException(
                        ErrorCode.CATEGORY_NOT_OWNED,
                        "Category does not belong to this restaurant."));

        MenuItem item = menuItemRepository.save(MenuItem.create(
                restaurantId,
                category.getId(),
                request.name(),
                request.description(),
                request.basePrice(),
                request.resolveIsVeg(),
                request.resolveFoodType()));
        publishPriceChanged(restaurantId, item.getId());
        menuCacheService.evict(restaurantId);
        return menuMapper.toMenuItem(item, null);
    }

    @Override
    @Transactional
    public MenuItemResponseDto updateItem(UUID ownerCredentialId, UUID menuItemId, UpdateMenuItemRequestDto request) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        MenuItem item = menuItemRepository.findByIdAndRestaurantId(menuItemId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Menu item not found."));

        UUID categoryId = request.categoryId();
        if (categoryId != null && !categoryId.equals(item.getCategoryId())) {
            categoryRepository.findByIdAndRestaurantId(categoryId, restaurantId)
                    .orElseThrow(() -> new UnprocessableEntityException(
                            ErrorCode.CATEGORY_NOT_OWNED,
                            "Category does not belong to this restaurant."));
        }

        boolean priceChanged = item.getBasePrice().compareTo(request.basePrice()) != 0;
        item.update(
                categoryId,
                request.name(),
                request.description(),
                request.basePrice(),
                request.resolveIsVeg(),
                request.resolveFoodType());

        if (priceChanged) {
            publishPriceChanged(restaurantId, item.getId());
        }
        menuCacheService.evict(restaurantId);
        return menuMapper.toMenuItem(item, signedOrNull(item.getImageS3Key()));
    }

    @Override
    @Transactional
    public void deleteItem(UUID ownerCredentialId, UUID menuItemId) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        MenuItem item = menuItemRepository.findByIdAndRestaurantId(menuItemId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Menu item not found."));
        item.softDelete();
        publishPriceChanged(restaurantId, item.getId());
        menuCacheService.evict(restaurantId);
    }

    @Override
    @Transactional
    public AvailabilityResponseDto updateAvailability(
            UUID ownerCredentialId,
            UUID menuItemId,
            UpdateAvailabilityRequestDto request) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        MenuItem item = menuItemRepository.findByIdAndRestaurantId(menuItemId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Menu item not found."));
        item.setAvailable(Boolean.TRUE.equals(request.isAvailable()));
        publishPriceChanged(restaurantId, item.getId());
        menuCacheService.evict(restaurantId);
        return menuMapper.toAvailability(item);
    }

    @Override
    @Transactional
    public VariantResponseDto addVariant(
            UUID ownerCredentialId,
            UUID menuItemId,
            CreateVariantRequestDto request) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        MenuItem item = menuItemRepository.findByIdAndRestaurantId(menuItemId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Menu item not found."));

        BigDecimal unit = item.getBasePrice().add(request.priceDelta());
        if (unit.compareTo(BigDecimal.ZERO) <= 0) {
            throw new UnprocessableEntityException(
                    ErrorCode.INVALID_VARIANT_PRICE,
                    "basePrice + priceDelta must be greater than zero.");
        }

        Variant variant = variantRepository.save(Variant.create(item.getId(), request.name(), request.priceDelta()));
        publishPriceChanged(restaurantId, item.getId());
        menuCacheService.evict(restaurantId);
        return menuMapper.toVariant(variant);
    }

    @Override
    @Transactional
    public MenuImageUploadResponseDto uploadItemImage(
            UUID ownerCredentialId,
            UUID menuItemId,
            MultipartFile file) {
        UUID restaurantId = requireOwnedRestaurantId(ownerCredentialId);
        MenuItem item = menuItemRepository.findByIdAndRestaurantId(menuItemId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Menu item not found."));

        if (file == null || file.isEmpty()) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "file is required.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new BadRequestException(ErrorCode.FILE_TOO_LARGE, "Menu image must be at most 5 MB.");
        }

        try {
            byte[] bytes = file.getBytes();
            if (bytes.length > MAX_IMAGE_BYTES) {
                throw new BadRequestException(ErrorCode.FILE_TOO_LARGE, "Menu image must be at most 5 MB.");
            }
            byte[] header = bytes.length <= 16 ? bytes : Arrays.copyOf(bytes, 16);
            ImageMagicBytes.DetectedImage detected = ImageMagicBytes.detect(header, file.getContentType());
            String key = "restaurants/" + restaurantId + "/menu-items/" + menuItemId
                    + "/" + UUID.randomUUID() + "." + detected.extension();
            objectStorageClient.putObject(
                    key, new ByteArrayInputStream(bytes), bytes.length, detected.contentType());
            Instant uploadedAt = Instant.now();
            item.setImageS3Key(key);
            menuCacheService.evict(restaurantId);
            return new MenuImageUploadResponseDto(key, uploadedAt);
        } catch (IOException ex) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "Unable to read uploaded file.");
        }
    }

    private UUID requireOwnedRestaurantId(UUID ownerCredentialId) {
        return restaurantSummaryProvider.findByOwnerUserCredentialId(ownerCredentialId)
                .map(RestaurantSummaryProvider.RestaurantSummary::restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant profile not found."));
    }

    private void publishPriceChanged(UUID restaurantId, UUID menuItemId) {
        eventPublisher.publishEvent(MenuItemPriceChangedEvent.of(restaurantId, menuItemId));
    }

    private String signedOrNull(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        return objectStorageClient.createSignedGetUrl(key, SIGNED_URL_TTL);
    }
}
