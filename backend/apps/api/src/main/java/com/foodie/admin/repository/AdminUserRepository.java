package com.foodie.admin.repository;

import com.foodie.admin.entity.AdminUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminUserRepository extends JpaRepository<AdminUser, UUID> {

    Optional<AdminUser> findByUserCredentialId(UUID userCredentialId);

    boolean existsByUserCredentialId(UUID userCredentialId);
}
