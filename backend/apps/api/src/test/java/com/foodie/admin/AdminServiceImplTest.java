package com.foodie.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.admin.entity.AdminRoleName;
import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.Role;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.AuditLogRepository;
import com.foodie.admin.repository.PermissionRepository;
import com.foodie.admin.repository.RoleRepository;
import com.foodie.admin.service.AdminService;
import com.foodie.admin.service.impl.AdminServiceImpl;
import com.foodie.common.exception.ForbiddenException;
import com.foodie.shared.contract.AdminCredentialPort;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminServiceImplTest {

    @Mock private AdminUserRepository adminUserRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PermissionRepository permissionRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private AdminCredentialPort adminCredentialPort;

    private AdminServiceImpl service;

    private final UUID creatorCredentialId = UUID.randomUUID();
    private final UUID creatorAdminId = UUID.randomUUID();
    private final UUID newCredentialId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new AdminServiceImpl(
                adminUserRepository,
                roleRepository,
                permissionRepository,
                auditLogRepository,
                adminCredentialPort,
                new ObjectMapper().findAndRegisterModules()
        );
    }

    @Test
    void createAdminUser_superAdmin_createsProfileAndAudits() {
        Role superRole = role(AdminRoleName.SUPER_ADMIN);
        Role opsRole = role(AdminRoleName.OPS);
        AdminUser creator = AdminUser.create(creatorCredentialId, superRole, "Boss");
        ReflectionTestUtils.setField(creator, "id", creatorAdminId);

        when(adminUserRepository.findByUserCredentialId(creatorCredentialId)).thenReturn(Optional.of(creator));
        when(roleRepository.findByName(AdminRoleName.OPS)).thenReturn(Optional.of(opsRole));
        when(adminCredentialPort.ensureAdminCredential("+911234567890", "ops@foodie.local"))
                .thenReturn(newCredentialId);
        when(adminUserRepository.existsByUserCredentialId(newCredentialId)).thenReturn(false);
        when(adminUserRepository.save(any(AdminUser.class))).thenAnswer(inv -> {
            AdminUser a = inv.getArgument(0);
            ReflectionTestUtils.setField(a, "id", UUID.randomUUID());
            return a;
        });

        AdminService.AdminUserView view = service.createAdminUser(
                new AdminService.CreateAdminUserCommand(
                        "Ops User", "+911234567890", "ops@foodie.local", AdminRoleName.OPS),
                new AdminService.ActorContext(creatorCredentialId)
        );

        assertThat(view.role()).isEqualTo(AdminRoleName.OPS);
        assertThat(view.fullName()).isEqualTo("Ops User");
        verify(auditLogRepository).save(any());
    }

    @Test
    void createAdminUser_nonSuperWithoutPermission_forbidden() {
        Role support = role(AdminRoleName.SUPPORT);
        AdminUser creator = AdminUser.create(creatorCredentialId, support, "Support");
        ReflectionTestUtils.setField(creator, "id", creatorAdminId);
        when(adminUserRepository.findByUserCredentialId(creatorCredentialId)).thenReturn(Optional.of(creator));
        when(adminUserRepository.findById(creatorAdminId)).thenReturn(Optional.of(creator));
        when(permissionRepository.existsByRoleIdAndResourceAndAction(
                support.getId(), "ADMIN_USER", "CREATE")).thenReturn(false);

        assertThatThrownBy(() -> service.createAdminUser(
                new AdminService.CreateAdminUserCommand(
                        "X", "+911111111111", null, AdminRoleName.OPS),
                new AdminService.ActorContext(creatorCredentialId)))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void hasPermission_superAdmin_alwaysTrue() {
        Role superRole = role(AdminRoleName.SUPER_ADMIN);
        AdminUser admin = AdminUser.create(creatorCredentialId, superRole, "Boss");
        ReflectionTestUtils.setField(admin, "id", creatorAdminId);
        when(adminUserRepository.findById(creatorAdminId)).thenReturn(Optional.of(admin));

        assertThat(service.hasPermission(creatorAdminId, "ANY", "THING")).isTrue();
    }

    @Test
    void recordAudit_persistsAppendOnlyRow() {
        service.recordAudit(creatorAdminId, "APPROVE_RESTAURANT", "RESTAURANT",
                UUID.randomUUID(), java.util.Map.of("status", "PENDING"), java.util.Map.of("status", "APPROVED"));

        ArgumentCaptor<com.foodie.admin.entity.AuditLog> captor =
                ArgumentCaptor.forClass(com.foodie.admin.entity.AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getAction()).isEqualTo("APPROVE_RESTAURANT");
        assertThat(captor.getValue().getBeforeState()).contains("PENDING");
    }

    private static Role role(AdminRoleName name) {
        return Role.ref(UUID.randomUUID(), name);
    }
}
