package com.foodie.admin.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "admin_user")
public class AdminUser extends BaseEntity {

    @Column(name = "user_credential_id", nullable = false, unique = true, updatable = false)
    private UUID userCredentialId;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "profile_image_key", length = 500)
    private String profileImageKey;

    protected AdminUser() {
    }

    public static AdminUser create(UUID userCredentialId, Role role, String fullName) {
        AdminUser admin = new AdminUser();
        admin.userCredentialId = userCredentialId;
        admin.role = role;
        admin.fullName = fullName;
        return admin;
    }

    public UUID getUserCredentialId() {
        return userCredentialId;
    }

    public Role getRole() {
        return role;
    }

    public String getFullName() {
        return fullName;
    }

    public String getProfileImageKey() {
        return profileImageKey;
    }
}
