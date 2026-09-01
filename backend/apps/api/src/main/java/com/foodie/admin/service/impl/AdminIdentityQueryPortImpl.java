package com.foodie.admin.service.impl;

import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.shared.contract.AdminIdentityQueryPort;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AdminIdentityQueryPortImpl implements AdminIdentityQueryPort {

    private final AdminUserRepository adminUserRepository;

    public AdminIdentityQueryPortImpl(AdminUserRepository adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    @Override
    public Optional<String> findRoleNameByUserCredentialId(UUID userCredentialId) {
        return adminUserRepository.findByUserCredentialId(userCredentialId)
                .map(admin -> admin.getRole().getName().name());
    }
}
