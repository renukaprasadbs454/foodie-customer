package com.foodie.menu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
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
import com.foodie.menu.service.impl.MenuServiceImpl;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import com.foodie.shared.event.MenuItemPriceChangedEvent;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class MenuServiceImplTest {

        @Mock
        private CategoryRepository categoryRepository;
        @Mock
        private MenuItemRepository menuItemRepository;
        @Mock
        private VariantRepository variantRepository;
        @Mock
        private RestaurantSummaryProvider restaurantSummaryProvider;
        @Mock
        private MenuCacheService menuCacheService;
        @Mock
        private ObjectStorageClient objectStorageClient;
        @Mock
        private ApplicationEventPublisher eventPublisher;

        private MenuServiceImpl service;
        private final UUID ownerId = UUID.randomUUID();
        private final UUID restaurantId = UUID.randomUUID();

        @BeforeEach
        void setUp() {
                service = new MenuServiceImpl(
                                categoryRepository,
                                menuItemRepository,
                                variantRepository,
                                new MenuMapper(),
                                restaurantSummaryProvider,
                                menuCacheService,
                                objectStorageClient,
                                eventPublisher,
                                new ObjectMapper().findAndRegisterModules());
        }

        @Test
        void createCategory_forOwnedRestaurant() {
                stubOwnedRestaurant();
                when(categoryRepository.save(any())).thenAnswer(inv -> {
                        Category c = inv.getArgument(0);
                        setId(c, UUID.randomUUID());
                        return c;
                });

                CategoryResponseDto dto = service.createCategory(
                                ownerId, new CreateCategoryRequestDto("Starters", 1));

                assertThat(dto.name()).isEqualTo("Starters");
                assertThat(dto.displayOrder()).isEqualTo(1);
                verify(menuCacheService).evict(restaurantId);
        }

        @Test
        void updateCategory_and_deleteCategory_succeeds() {
                stubOwnedRestaurant();
                Category category = Category.create(restaurantId, "Starters", 1);
                setId(category, UUID.randomUUID());
                when(categoryRepository.findByIdAndRestaurantId(category.getId(), restaurantId))
                                .thenReturn(Optional.of(category));

                CategoryResponseDto updated = service.updateCategory(
                                ownerId, category.getId(), new UpdateCategoryRequestDto("Appetizers", 2));
                assertThat(updated.name()).isEqualTo("Appetizers");
                assertThat(updated.displayOrder()).isEqualTo(2);

                when(menuItemRepository.findByCategoryIdOrderByCreatedAtAsc(category.getId())).thenReturn(List.of());
                service.deleteCategory(ownerId, category.getId());
                assertThat(category.getDeletedAt()).isNotNull();
                verify(menuCacheService, org.mockito.Mockito.times(2)).evict(restaurantId);
        }

        @Test
        void createItem_categoryNotOwned_throws422() {
                stubOwnedRestaurant();
                UUID foreignCategory = UUID.randomUUID();
                when(categoryRepository.findByIdAndRestaurantId(foreignCategory, restaurantId))
                                .thenReturn(Optional.empty());

                assertThatThrownBy(() -> service.createItem(ownerId, new CreateMenuItemRequestDto(
                                foreignCategory, "Paneer Tikka", "desc", new BigDecimal("220.00"), true)))
                                .isInstanceOf(UnprocessableEntityException.class)
                                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.CATEGORY_NOT_OWNED);
        }

        @Test
        void createItem_publishesPriceChangedEvent_andSupportsFoodType() {
                stubOwnedRestaurant();
                Category category = Category.create(restaurantId, "Starters", 1);
                setId(category, UUID.randomUUID());
                when(categoryRepository.findByIdAndRestaurantId(category.getId(), restaurantId))
                                .thenReturn(Optional.of(category));
                when(menuItemRepository.save(any())).thenAnswer(inv -> {
                        MenuItem item = inv.getArgument(0);
                        setId(item, UUID.randomUUID());
                        return item;
                });

                // Non-veg creation
                MenuItemResponseDto dto = service.createItem(ownerId, new CreateMenuItemRequestDto(
                                category.getId(), "Chicken Biryani", "Fragrant", new BigDecimal("320.00"), null,
                                "NON_VEG"));

                assertThat(dto.isAvailable()).isTrue();
                assertThat(dto.basePrice()).isEqualByComparingTo("320.00");
                assertThat(dto.foodType()).isEqualTo("NON_VEG");
                assertThat(dto.isVeg()).isFalse();
                verify(eventPublisher).publishEvent(any(MenuItemPriceChangedEvent.class));
                verify(menuCacheService).evict(restaurantId);
        }

        @Test
        void updateItem_and_deleteItem_succeeds() {
                stubOwnedRestaurant();
                Category category = Category.create(restaurantId, "Starters", 1);
                setId(category, UUID.randomUUID());
                MenuItem item = MenuItem.create(
                                restaurantId, category.getId(), "Item", "Old Desc", new BigDecimal("100.00"), true);
                setId(item, UUID.randomUUID());
                when(menuItemRepository.findByIdAndRestaurantId(item.getId(), restaurantId))
                                .thenReturn(Optional.of(item));

                UpdateMenuItemRequestDto updateReq = new UpdateMenuItemRequestDto(
                                category.getId(), "Updated Item", "New Desc", new BigDecimal("150.00"), null,
                                "NON_VEG");
                MenuItemResponseDto updatedDto = service.updateItem(ownerId, item.getId(), updateReq);

                assertThat(updatedDto.name()).isEqualTo("Updated Item");
                assertThat(updatedDto.basePrice()).isEqualByComparingTo("150.00");
                assertThat(updatedDto.foodType()).isEqualTo("NON_VEG");
                assertThat(updatedDto.isVeg()).isFalse();

                service.deleteItem(ownerId, item.getId());
                assertThat(item.getDeletedAt()).isNotNull();
                verify(menuCacheService, org.mockito.Mockito.times(2)).evict(restaurantId);
        }

        @Test
        void addVariant_invalidPrice_throws422() {
                stubOwnedRestaurant();
                MenuItem item = MenuItem.create(
                                restaurantId, UUID.randomUUID(), "Item", null, new BigDecimal("50.00"), true);
                setId(item, UUID.randomUUID());
                when(menuItemRepository.findByIdAndRestaurantId(item.getId(), restaurantId))
                                .thenReturn(Optional.of(item));

                assertThatThrownBy(() -> service.addVariant(
                                ownerId, item.getId(), new CreateVariantRequestDto("Tiny", new BigDecimal("-50.00"))))
                                .isInstanceOf(UnprocessableEntityException.class)
                                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.INVALID_VARIANT_PRICE);
        }

        @Test
        void addVariant_success() {
                stubOwnedRestaurant();
                MenuItem item = MenuItem.create(
                                restaurantId, UUID.randomUUID(), "Item", null, new BigDecimal("100.00"), true);
                setId(item, UUID.randomUUID());
                when(menuItemRepository.findByIdAndRestaurantId(item.getId(), restaurantId))
                                .thenReturn(Optional.of(item));
                when(variantRepository.save(any())).thenAnswer(inv -> {
                        Variant v = inv.getArgument(0);
                        setId(v, UUID.randomUUID());
                        return v;
                });

                VariantResponseDto dto = service.addVariant(
                                ownerId, item.getId(), new CreateVariantRequestDto("Full", new BigDecimal("120.00")));

                assertThat(dto.name()).isEqualTo("Full");
                assertThat(dto.priceDelta()).isEqualByComparingTo("120.00");
                verify(eventPublisher).publishEvent(any(MenuItemPriceChangedEvent.class));
        }

        @Test
        void updateAvailability_togglesFlag() {
                stubOwnedRestaurant();
                MenuItem item = MenuItem.create(
                                restaurantId, UUID.randomUUID(), "Item", null, new BigDecimal("100.00"), true);
                setId(item, UUID.randomUUID());
                when(menuItemRepository.findByIdAndRestaurantId(item.getId(), restaurantId))
                                .thenReturn(Optional.of(item));

                AvailabilityResponseDto dto = service.updateAvailability(
                                ownerId, item.getId(), new UpdateAvailabilityRequestDto(false));

                assertThat(dto.isAvailable()).isFalse();
                verify(eventPublisher).publishEvent(any(MenuItemPriceChangedEvent.class));
        }

        @Test
        void getFullMenu_buildsTree_andCaches() throws Exception {
                when(restaurantSummaryProvider.findByRestaurantId(restaurantId))
                                .thenReturn(Optional.of(summary()));
                when(menuCacheService.get(restaurantId)).thenReturn(Optional.empty());

                Category category = Category.create(restaurantId, "Starters", 1);
                setId(category, UUID.randomUUID());
                MenuItem item = MenuItem.create(
                                restaurantId, category.getId(), "Paneer Tikka", "desc",
                                new BigDecimal("220.00"), true);
                setId(item, UUID.randomUUID());
                item.setAvailable(false);
                Variant variant = Variant.create(item.getId(), "Full", new BigDecimal("120.00"));
                setId(variant, UUID.randomUUID());

                when(categoryRepository.findByRestaurantIdOrderByDisplayOrderAsc(restaurantId))
                                .thenReturn(List.of(category));
                when(menuItemRepository.findByRestaurantIdOrderByCreatedAtAsc(restaurantId))
                                .thenReturn(List.of(item));
                when(variantRepository.findByMenuItemIdInOrderByCreatedAtAsc(List.of(item.getId())))
                                .thenReturn(List.of(variant));

                FullMenuResponseDto menu = service.getFullMenu(restaurantId);

                assertThat(menu.categories()).hasSize(1);
                assertThat(menu.categories().getFirst().items()).hasSize(1);
                assertThat(menu.categories().getFirst().items().getFirst().isAvailable()).isFalse();
                assertThat(menu.categories().getFirst().items().getFirst().variants()).hasSize(1);
                assertThat(menu.categories().getFirst().items().getFirst().foodType()).isEqualTo("VEG");
                verify(menuCacheService).put(any(), any());
        }

        @Test
        void getFullMenu_missingRestaurant_404() {
                when(restaurantSummaryProvider.findByRestaurantId(restaurantId)).thenReturn(Optional.empty());
                assertThatThrownBy(() -> service.getFullMenu(restaurantId))
                                .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        void uploadItemImage_persistsKey() throws Exception {
                stubOwnedRestaurant();
                MenuItem item = MenuItem.create(
                                restaurantId, UUID.randomUUID(), "Item", null, new BigDecimal("100.00"), true);
                setId(item, UUID.randomUUID());
                when(menuItemRepository.findByIdAndRestaurantId(item.getId(), restaurantId))
                                .thenReturn(Optional.of(item));

                byte[] png = new byte[] {
                                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                                0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3
                };
                var response = service.uploadItemImage(
                                ownerId, item.getId(),
                                new MockMultipartFile("file", "a.png", "image/png", png));

                assertThat(response.fileKey()).contains("/menu-items/");
                assertThat(item.getImageS3Key()).isEqualTo(response.fileKey());
                verify(menuCacheService).evict(restaurantId);
        }

        private void stubOwnedRestaurant() {
                when(restaurantSummaryProvider.findByOwnerUserCredentialId(ownerId))
                                .thenReturn(Optional.of(summary()));
        }

        private RestaurantSummaryProvider.RestaurantSummary summary() {
                return new RestaurantSummaryProvider.RestaurantSummary(
                                restaurantId, "Spice Route", "APPROVED", null);
        }

        private static void setId(Object entity, UUID id) {
                try {
                        var field = entity.getClass().getSuperclass().getDeclaredField("id");
                        field.setAccessible(true);
                        field.set(entity, id);
                } catch (ReflectiveOperationException ex) {
                        throw new IllegalStateException(ex);
                }
        }
}
