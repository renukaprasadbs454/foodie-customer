package com.foodie.admin.service;

import com.foodie.admin.dto.response.AdminUserResponseDto;
import com.foodie.admin.entity.AdminRoleName;
import java.util.UUID;

/**
 * Admin public interface (Phase3 §2.13).
 */
public interface AdminService {

    record CreateAdminUserCommand(
            String fullName,
            String phoneNumber,
            String email,
            AdminRoleName role
    ) {
    }

    record ActorContext(UUID actorUserCredentialId) {
    }

    record AdminUserView(
            UUID adminUserId,
            UUID userCredentialId,
            String fullName,
            AdminRoleName role,
            String profileImageKey
    ) {
    }

    AdminUserView createAdminUser(CreateAdminUserCommand cmd, ActorContext creator);

    boolean hasPermission(UUID adminUserId, String resource, String action);

    void recordAudit(
            UUID adminUserId,
            String action,
            String resourceType,
            UUID resourceId,
            Object before,
            Object after
    );

    AdminUserView requireAdminProfile(UUID userCredentialId);

    AdminUserResponseDto toResponse(AdminUserView view);
}
