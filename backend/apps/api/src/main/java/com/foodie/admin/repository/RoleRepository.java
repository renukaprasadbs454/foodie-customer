package com.foodie.admin.repository;

import com.foodie.admin.entity.AdminRoleName;
import com.foodie.admin.entity.Role;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByName(AdminRoleName name);
}
