package com.foodie.auth.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.UserType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_credential")
public class UserCredential extends BaseEntity {

    /** Unique with {@code userType} at DB level — same phone may own multiple app roles. */
    @Column(name = "phone_number", length = 15)
    private String phoneNumber;

    @Column(name = "email")
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "google_id", unique = true)
    private String googleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", nullable = false, length = 20)
    private UserType userType;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected UserCredential() {
    }

    public static UserCredential phoneSignup(String phoneNumber, UserType userType) {
        UserCredential credential = new UserCredential();
        credential.phoneNumber = phoneNumber;
        credential.userType = userType;
        credential.active = true;
        return credential;
    }

    public static UserCredential googleSignup(String googleId, String email) {
        UserCredential credential = new UserCredential();
        credential.googleId = googleId;
        credential.email = email;
        credential.userType = UserType.CUSTOMER;
        credential.active = true;
        return credential;
    }

    public static UserCredential customerPasswordSignup(String email, String phoneNumber, String passwordHash) {
        UserCredential credential = new UserCredential();
        credential.email = email;
        credential.phoneNumber = phoneNumber;
        credential.passwordHash = passwordHash;
        credential.userType = UserType.CUSTOMER;
        credential.active = true;
        return credential;
    }

    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    /** Provisioned by Admin module via {@code AdminCredentialPort} — never OTP self-signup. */
    public static UserCredential adminProvision(String phoneNumber, String email) {
        UserCredential credential = new UserCredential();
        credential.phoneNumber = phoneNumber;
        credential.email = email;
        credential.userType = UserType.ADMIN;
        credential.active = true;
        return credential;
    }

    /**
     * Admin with email/password (GAP-API-13). {@code passwordHash} must already be BCrypt-encoded.
     */
    public static UserCredential adminProvisionWithPassword(
            String phoneNumber,
            String email,
            String passwordHash
    ) {
        UserCredential credential = adminProvision(phoneNumber, email);
        credential.passwordHash = passwordHash;
        return credential;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getGoogleId() {
        return googleId;
    }

    public UserType getUserType() {
        return userType;
    }

    public boolean isActive() {
        return active;
    }

    public void deactivate() {
        this.active = false;
    }
}
