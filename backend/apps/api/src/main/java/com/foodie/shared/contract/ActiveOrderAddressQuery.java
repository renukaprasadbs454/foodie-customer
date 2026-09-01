package com.foodie.shared.contract;

import java.util.UUID;

/**
 * Order module implements this once orders exist.
 * User checks before soft-deleting an address (ADDRESS_IN_USE_BY_ACTIVE_ORDER).
 * User never reads Order tables directly (Phase3 §2.2).
 */
public interface ActiveOrderAddressQuery {

    boolean isAddressReferencedByActiveOrder(UUID addressId);
}
