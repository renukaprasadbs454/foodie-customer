package com.foodie.shared.contract;

import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Default until the Order module provides a real {@link ActiveOrderAddressQuery}
 * (replace this bean or mark the Order implementation {@code @Primary}).
 */
@Component
public class NoActiveOrdersAddressQuery implements ActiveOrderAddressQuery {

    @Override
    public boolean isAddressReferencedByActiveOrder(UUID addressId) {
        return false;
    }
}
