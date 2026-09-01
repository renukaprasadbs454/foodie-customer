package com.foodie.cart;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.cart.dto.request.AddCartItemRequestDto;
import com.foodie.cart.dto.response.CartConflictHintDto;
import com.foodie.cart.dto.response.CartResponseDto;
import com.foodie.cart.entity.Cart;
import com.foodie.cart.entity.CartItem;
import com.foodie.cart.mapper.CartMapper;
import com.foodie.cart.repository.CartItemRepository;
import com.foodie.cart.repository.CartRepository;
import com.foodie.cart.service.impl.CartServiceImpl;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.MenuItemPriceProvider;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CartServiceImplTest {

    @Mock
    private CartRepository cartRepository;
    @Mock
    private CartItemRepository cartItemRepository;
    @Mock
    private CustomerSummaryProvider customerSummaryProvider;
    @Mock
    private MenuItemPriceProvider menuItemPriceProvider;
    @Mock
    private RestaurantSummaryProvider restaurantSummaryProvider;

    private CartServiceImpl service;
    private final UUID credentialId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();
    private final UUID restaurantA = UUID.randomUUID();
    private final UUID restaurantB = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new CartServiceImpl(
                cartRepository,
                cartItemRepository,
                new CartMapper(),
                customerSummaryProvider,
                menuItemPriceProvider,
                restaurantSummaryProvider
        );
    }

    @Test
    void getOrCreate_createsEmptyCart() {
        stubCustomer();
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.empty());
        when(cartRepository.save(any())).thenAnswer(inv -> {
            Cart c = inv.getArgument(0);
            setId(c, UUID.randomUUID());
            return c;
        });
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(any())).thenReturn(List.of());

        CartResponseDto cart = service.getOrCreate(credentialId);

        assertThat(cart.restaurantId()).isNull();
        assertThat(cart.items()).isEmpty();
        assertThat(cart.subtotal()).isEqualByComparingTo("0.00");
    }

    @Test
    void addItem_setsRestaurantAndSubtotal() {
        stubCustomer();
        Cart cart = Cart.createEmpty(customerId);
        setId(cart, UUID.randomUUID());
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));

        UUID menuItemId = UUID.randomUUID();
        when(menuItemPriceProvider.getPriceSnapshot(menuItemId, null)).thenReturn(Optional.of(
                new MenuItemPriceProvider.MenuItemPriceSnapshot(
                        menuItemId, null, restaurantA, new BigDecimal("100.00"), true, "Item")));
        when(cartItemRepository.findByCartIdAndMenuItemIdAndVariantIdIsNull(cart.getId(), menuItemId))
                .thenReturn(Optional.empty());
        when(cartItemRepository.save(any())).thenAnswer(inv -> {
            CartItem item = inv.getArgument(0);
            setId(item, UUID.randomUUID());
            return item;
        });
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId())).thenAnswer(inv -> {
            CartItem item = CartItem.create(cart, menuItemId, null, 2, null);
            setId(item, UUID.randomUUID());
            return List.of(item);
        });

        CartResponseDto view = service.addItem(
                credentialId, new AddCartItemRequestDto(menuItemId, null, 2, "Less spicy"));

        assertThat(cart.getRestaurantId()).isEqualTo(restaurantA);
        assertThat(view.subtotal()).isEqualByComparingTo("200.00");
        assertThat(view.items()).hasSize(1);
    }

    @Test
    void addItem_restaurantConflict_includesSuggestedAction() {
        stubCustomer();
        Cart cart = Cart.createEmpty(customerId);
        setId(cart, UUID.randomUUID());
        cart.setRestaurantId(restaurantA);
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));

        UUID menuItemId = UUID.randomUUID();
        when(menuItemPriceProvider.getPriceSnapshot(menuItemId, null)).thenReturn(Optional.of(
                new MenuItemPriceProvider.MenuItemPriceSnapshot(
                        menuItemId, null, restaurantB, new BigDecimal("50.00"), true, "Item")));

        assertThatThrownBy(() -> service.addItem(
                credentialId, new AddCartItemRequestDto(menuItemId, null, 1, null)))
                .isInstanceOf(ConflictException.class)
                .satisfies(ex -> {
                    ConflictException conflict = (ConflictException) ex;
                    assertThat(conflict.getErrorCode()).isEqualTo(ErrorCode.CART_RESTAURANT_CONFLICT);
                    assertThat(conflict.getData()).isInstanceOf(CartConflictHintDto.class);
                    assertThat(((CartConflictHintDto) conflict.getData()).suggestedAction())
                            .isEqualTo("CLEAR_CART");
                });
        verify(cartItemRepository, never()).save(any());
    }

    @Test
    void addItem_unavailable_throws422() {
        stubCustomer();
        Cart cart = Cart.createEmpty(customerId);
        setId(cart, UUID.randomUUID());
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));

        UUID menuItemId = UUID.randomUUID();
        when(menuItemPriceProvider.getPriceSnapshot(menuItemId, null)).thenReturn(Optional.of(
                new MenuItemPriceProvider.MenuItemPriceSnapshot(
                        menuItemId, null, restaurantA, new BigDecimal("50.00"), false, "Item")));

        assertThatThrownBy(() -> service.addItem(
                credentialId, new AddCartItemRequestDto(menuItemId, null, 1, null)))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ITEM_UNAVAILABLE);
    }

    @Test
    void addItem_upsertsQuantity() {
        stubCustomer();
        Cart cart = Cart.createEmpty(customerId);
        setId(cart, UUID.randomUUID());
        cart.setRestaurantId(restaurantA);
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));

        UUID menuItemId = UUID.randomUUID();
        CartItem existing = CartItem.create(cart, menuItemId, null, 2, "old");
        setId(existing, UUID.randomUUID());
        when(menuItemPriceProvider.getPriceSnapshot(menuItemId, null)).thenReturn(Optional.of(
                new MenuItemPriceProvider.MenuItemPriceSnapshot(
                        menuItemId, null, restaurantA, new BigDecimal("10.00"), true, "Item")));
        when(cartItemRepository.findByCartIdAndMenuItemIdAndVariantIdIsNull(cart.getId(), menuItemId))
                .thenReturn(Optional.of(existing));
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId()))
                .thenReturn(List.of(existing));

        service.addItem(credentialId, new AddCartItemRequestDto(menuItemId, null, 3, "new notes"));

        assertThat(existing.getQuantity()).isEqualTo(5);
        assertThat(existing.getNotes()).isEqualTo("new notes");
        verify(cartItemRepository, never()).save(any());
    }

    @Test
    void removeItem_clearsRestaurantWhenEmpty() {
        stubCustomer();
        Cart cart = Cart.createEmpty(customerId);
        setId(cart, UUID.randomUUID());
        cart.setRestaurantId(restaurantA);
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));

        CartItem item = CartItem.create(cart, UUID.randomUUID(), null, 1, null);
        setId(item, UUID.randomUUID());
        when(cartItemRepository.findByIdAndCartId(item.getId(), cart.getId())).thenReturn(Optional.of(item));
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId()))
                .thenReturn(List.of())
                .thenReturn(List.of());

        CartResponseDto view = service.removeItem(credentialId, item.getId());

        verify(cartItemRepository).delete(item);
        assertThat(cart.getRestaurantId()).isNull();
        assertThat(view.items()).isEmpty();
    }

    @Test
    void clear_deletesLines() {
        stubCustomer();
        Cart cart = Cart.createEmpty(customerId);
        setId(cart, UUID.randomUUID());
        cart.setRestaurantId(restaurantA);
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));

        service.clear(credentialId);

        verify(cartItemRepository).deleteAllByCartId(cart.getId());
        assertThat(cart.getRestaurantId()).isNull();
    }

    @Test
    void getOrCreate_missingCustomer_404() {
        when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getOrCreate(credentialId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private void stubCustomer() {
        when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.of(
                new CustomerSummaryProvider.CustomerSummary(customerId, "Ananya", null)));
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
