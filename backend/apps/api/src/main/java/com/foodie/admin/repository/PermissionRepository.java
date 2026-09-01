package com.foodie.admin.repository;

import com.foodie.admin.entity.Permission;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    boolean existsByRoleIdAndResourceAndAction(UUID roleId, String resource, String action);
}
