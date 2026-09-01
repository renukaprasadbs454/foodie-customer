package com.foodie.auth.service.impl;

import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.shared.contract.AdminCredentialPort;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminCredentialPortImpl implements AdminCredentialPort {

    private final UserCredentialRepository userCredentialRepository;

    public AdminCredentialPortImpl(UserCredentialRepository userCredentialRepository) {
        this.userCredentialRepository = userCredentialRepository;
    }

    @Override
    @Transactional
    public UUID ensureAdminCredential(String phoneNumber, String email) {
        var existingForPhone = userCredentialRepository.findAllByPhoneNumber(phoneNumber);
        Optional<UserCredential> existingAdmin = existingForPhone.stream()
                .filter(c -> c.getUserType() == UserType.ADMIN)
                .findFirst();
        if (existingAdmin.isPresent()) {
            return existingAdmin.get().getId();
        }
        boolean usedByNonAdmin = existingForPhone.stream()
                .anyMatch(c -> c.getUserType() != UserType.ADMIN);
        if (usedByNonAdmin) {
            throw new ConflictException(
                    ErrorCode.CONFLICT,
                    "Phone number is already registered to a non-admin account."
            );
        }
        return userCredentialRepository
                .save(UserCredential.adminProvision(phoneNumber, email))
                .getId();
    }
}
