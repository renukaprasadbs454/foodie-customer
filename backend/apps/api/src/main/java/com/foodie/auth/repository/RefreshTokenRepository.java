package com.foodie.auth.repository;

import com.foodie.auth.entity.RefreshToken;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update RefreshToken t set t.revoked = true where t.userCredential.id = :userId and t.revoked = false")
    int revokeAllActiveForUser(@Param("userId") UUID userId);

    List<RefreshToken> findByUserCredentialIdAndRevokedFalse(UUID userCredentialId);
}
