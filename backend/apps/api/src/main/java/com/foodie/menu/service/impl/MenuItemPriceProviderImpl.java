package com.foodie.menu.service.impl;

import com.foodie.menu.entity.MenuItem;
import com.foodie.menu.entity.Variant;
import com.foodie.menu.repository.MenuItemRepository;
import com.foodie.menu.repository.VariantRepository;
import com.foodie.shared.contract.MenuItemPriceProvider;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MenuItemPriceProviderImpl implements MenuItemPriceProvider {

    private final MenuItemRepository menuItemRepository;
    private final VariantRepository variantRepository;

    public MenuItemPriceProviderImpl(
            MenuItemRepository menuItemRepository,
            VariantRepository variantRepository
    ) {
        this.menuItemRepository = menuItemRepository;
        this.variantRepository = variantRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MenuItemPriceSnapshot> getPriceSnapshot(UUID menuItemId, UUID variantId) {
        Optional<MenuItem> itemOpt = menuItemRepository.findById(menuItemId);
        if (itemOpt.isEmpty()) {
            return Optional.empty();
        }
        MenuItem item = itemOpt.get();
        BigDecimal unitPrice = item.getBasePrice();
        UUID resolvedVariantId = null;
        if (variantId != null) {
            Optional<Variant> variantOpt = variantRepository.findByIdAndMenuItemId(variantId, menuItemId);
            if (variantOpt.isEmpty()) {
                return Optional.empty();
            }
            Variant variant = variantOpt.get();
            unitPrice = item.getBasePrice().add(variant.getPriceDelta());
            resolvedVariantId = variant.getId();
        }
        return Optional.of(new MenuItemPriceSnapshot(
                item.getId(),
                resolvedVariantId,
                item.getRestaurantId(),
                unitPrice,
                item.isAvailable(),
                item.getName()
        ));
    }
}
