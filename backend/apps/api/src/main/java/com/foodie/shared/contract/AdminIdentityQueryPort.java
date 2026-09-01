package com.foodie.shared.contract;

import java.util.Optional;
import java.util.UUID;

/**
 * Auth → Admin identity lookup without creating an auth→admin package cycle.
 * Used by Admin email/password login and token issuance (GAP-API-13).
 */
public interface AdminIdentityQueryPort {

    /** Binding Admin role name (e.g. SUPER_ADMIN), if an admin_user row exists. */
    Optional<String> findRoleNameByUserCredentialId(UUID userCredentialId);
}
