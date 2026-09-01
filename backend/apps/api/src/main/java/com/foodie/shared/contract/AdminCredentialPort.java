package com.foodie.shared.contract;

import java.util.UUID;

/**
 * Auth-owned provisioning for Admin users (Phase3 §2.13 / §5.1).
 * ADMIN credentials are never self-registered via OTP signup.
 */
public interface AdminCredentialPort {

    /**
     * Creates an active {@code user_credential} with {@code userType=ADMIN} for phone OTP login,
     * or returns the existing ADMIN credential id for the phone.
     */
    UUID ensureAdminCredential(String phoneNumber, String email);
}
