package com.foodie.auth.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_token")
public class RefreshToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_credential_id", nullable = false)
    private UserCredential userCredential;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "is_revoked", nullable = false)
    private boolean revoked;

    @Column(name = "replaced_by_id")
    private UUID replacedById;

    @Column(name = "device_info", length = 255)
    private String deviceInfo;

    protected RefreshToken() {
    }

    public static RefreshToken issue(
            UserCredential userCredential,
            String tokenHash,
            Instant expiresAt,
            String deviceInfo
    ) {
        RefreshToken token = new RefreshToken();
        token.userCredential = userCredential;
        token.tokenHash = tokenHash;
        token.expiresAt = expiresAt;
        token.revoked = false;
        token.deviceInfo = deviceInfo;
        return token;
    }

    public UserCredential getUserCredential() {
        return userCredential;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public String getDeviceInfo() {
        return deviceInfo;
    }

    public void revoke() {
        this.revoked = true;
    }

    public void linkReplacement(UUID replacementId) {
        this.replacedById = replacementId;
    }
}
