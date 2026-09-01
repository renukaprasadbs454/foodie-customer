package com.foodie.shared.contract;

import java.util.UUID;

/**
 * Order validates checkout address ownership without reading User tables (Phase3 §2.6).
 */
public interface CustomerAddressOwnershipQuery {

    boolean isAddressOwnedByCustomer(UUID addressId, UUID customerId);
}
