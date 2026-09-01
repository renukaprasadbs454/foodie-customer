package com.foodie.admin.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.admin.dto.response.AdminUserResponseDto;
import com.foodie.admin.entity.AdminRoleName;
import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.AuditLog;
import com.foodie.admin.entity.Role;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.AuditLogRepository;
import com.foodie.admin.repository.PermissionRepository;
import com.foodie.admin.repository.RoleRepository;
import com.foodie.admin.service.AdminService;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ForbiddenException;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.shared.contract.AdminCredentialPort;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminServiceImpl implements AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminServiceImpl.class);

    private final AdminUserRepository adminUserRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminCredentialPort adminCredentialPort;
    private final ObjectMapper objectMapper;

    public AdminServiceImpl(
            AdminUserRepository adminUserRepository,
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            AuditLogRepository auditLogRepository,
            AdminCredentialPort adminCredentialPort,
            ObjectMapper objectMapper
    ) {
        this.adminUserRepository = adminUserRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.auditLogRepository = auditLogRepository;
        this.adminCredentialPort = adminCredentialPort;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public AdminUserView createAdminUser(CreateAdminUserCommand cmd, ActorContext creator) {
        AdminUser creatorAdmin = adminUserRepository.findByUserCredentialId(creator.actorUserCredentialId())
                .orElseThrow(() -> new ForbiddenException("Only provisioned admins may create admin users."));
        if (creatorAdmin.getRole().getName() != AdminRoleName.SUPER_ADMIN
                && !hasPermission(creatorAdmin.getId(), "ADMIN_USER", "CREATE")) {
            throw new ForbiddenException("SUPER_ADMIN required to create admin users.");
        }
        Role role = roleRepository.findByName(cmd.role())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found."));
        UUID credentialId = adminCredentialPort.ensureAdminCredential(cmd.phoneNumber(), cmd.email());
        if (adminUserRepository.existsByUserCredentialId(credentialId)) {
            throw new ConflictException(ErrorCode.CONFLICT, "Admin profile already exists for this credential.");
        }
        AdminUser created = AdminUser.create(credentialId, role, cmd.fullName().trim());
        try {
            created = adminUserRepository.save(created);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(ErrorCode.CONFLICT, "Admin profile already exists for this credential.");
        }
        recordAudit(
                creatorAdmin.getId(),
                "CREATE_ADMIN_USER",
                "ADMIN_USER",
                created.getId(),
                null,
                Map.of(
                        "adminUserId", created.getId(),
                        "role", role.getName().name(),
                        "fullName", created.getFullName()
                )
        );
        return toView(created);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasPermission(UUID adminUserId, String resource, String action) {
        AdminUser admin = adminUserRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found."));
        if (admin.getRole().getName() == AdminRoleName.SUPER_ADMIN) {
            return true;
        }
        return permissionRepository.existsByRoleIdAndResourceAndAction(
                admin.getRole().getId(), resource, action);
    }

    @Override
    @Transactional
    public void recordAudit(
            UUID adminUserId,
            String action,
            String resourceType,
            UUID resourceId,
            Object before,
            Object after
    ) {
        auditLogRepository.save(AuditLog.append(
                adminUserId,
                action,
                resourceType,
                resourceId,
                toJson(before),
                toJson(after)
        ));
        log.debug("audit action={} resourceType={} resourceId={} admin={}",
                action, resourceType, resourceId, adminUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminUserView requireAdminProfile(UUID userCredentialId) {
        return adminUserRepository.findByUserCredentialId(userCredentialId)
                .map(this::toView)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Admin profile not found for this credential."));
    }

    @Override
    public AdminUserResponseDto toResponse(AdminUserView view) {
        return new AdminUserResponseDto(
                view.adminUserId(),
                view.userCredentialId(),
                view.fullName(),
                view.role(),
                view.profileImageKey()
        );
    }

    private AdminUserView toView(AdminUser admin) {
        return new AdminUserView(
                admin.getId(),
                admin.getUserCredentialId(),
                admin.getFullName(),
                admin.getRole().getName(),
                admin.getProfileImageKey()
        );
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            if (value instanceof String s) {
                return s;
            }
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return "{\"_error\":\"unserializable\"}";
        }
    }
}
