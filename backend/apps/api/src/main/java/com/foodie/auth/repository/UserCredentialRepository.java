package com.foodie.auth.repository;

import com.foodie.auth.entity.UserCredential;
import com.foodie.common.enums.UserType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserCredentialRepository extends JpaRepository<UserCredential, UUID> {
    Optional<UserCredential> findByPhoneNumberAndUserType(String phoneNumber, UserType userType);

    List<UserCredential> findAllByPhoneNumber(String phoneNumber);

    Optional<UserCredential> findByGoogleId(String googleId);

    Optional<UserCredential> findByEmailIgnoreCaseAndUserType(String email, UserType userType);
}
