package com.foodie.menu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.foodie.menu.entity.MenuItem;
import com.foodie.menu.entity.Variant;
import com.foodie.menu.repository.MenuItemRepository;
import com.foodie.menu.repository.VariantRepository;
import com.foodie.menu.service.impl.MenuItemPriceProviderImpl;
import com.foodie.shared.contract.MenuItemPriceProvider;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MenuItemPriceProviderImplTest {

    @Mock
    private MenuItemRepository menuItemRepository;
    @Mock
    private VariantRepository variantRepository;

    private MenuItemPriceProviderImpl provider;

    @BeforeEach
    void setUp() {
        provider = new MenuItemPriceProviderImpl(menuItemRepository, variantRepository);
    }

    @Test
    void snapshot_withoutVariant_usesBasePrice() {
        UUID restaurantId = UUID.randomUUID();
        MenuItem item = MenuItem.create(
                restaurantId, UUID.randomUUID(), "Item", null, new BigDecimal("220.00"), true);
        setId(item, UUID.randomUUID());
        when(menuItemRepository.findById(item.getId())).thenReturn(Optional.of(item));

        Optional<MenuItemPriceProvider.MenuItemPriceSnapshot> snap =
                provider.getPriceSnapshot(item.getId(), null);

        assertThat(snap).isPresent();
        assertThat(snap.get().unitPrice()).isEqualByComparingTo("220.00");
        assertThat(snap.get().variantId()).isNull();
        assertThat(snap.get().available()).isTrue();
        assertThat(snap.get().itemName()).isEqualTo("Item");
    }

    @Test
    void snapshot_withVariant_addsDelta() {
        UUID restaurantId = UUID.randomUUID();
        MenuItem item = MenuItem.create(
                restaurantId, UUID.randomUUID(), "Item", null, new BigDecimal("220.00"), true);
        setId(item, UUID.randomUUID());
        Variant variant = Variant.create(item.getId(), "Full", new BigDecimal("120.00"));
        setId(variant, UUID.randomUUID());
        when(menuItemRepository.findById(item.getId())).thenReturn(Optional.of(item));
        when(variantRepository.findByIdAndMenuItemId(variant.getId(), item.getId()))
                .thenReturn(Optional.of(variant));

        var snap = provider.getPriceSnapshot(item.getId(), variant.getId()).orElseThrow();

        assertThat(snap.unitPrice()).isEqualByComparingTo("340.00");
        assertThat(snap.variantId()).isEqualTo(variant.getId());
    }

    @Test
    void snapshot_foreignVariant_empty() {
        MenuItem item = MenuItem.create(
                UUID.randomUUID(), UUID.randomUUID(), "Item", null, new BigDecimal("10.00"), true);
        setId(item, UUID.randomUUID());
        when(menuItemRepository.findById(item.getId())).thenReturn(Optional.of(item));
        when(variantRepository.findByIdAndMenuItemId(any(), eq(item.getId()))).thenReturn(Optional.empty());

        assertThat(provider.getPriceSnapshot(item.getId(), UUID.randomUUID())).isEmpty();
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
