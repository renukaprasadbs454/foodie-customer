package com.foodie.user.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "customer")
public class Customer extends BaseEntity {

    @Column(name = "user_credential_id", nullable = false, unique = true, updatable = false)
    private UUID userCredentialId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "email")
    private String email;

    @Column(name = "profile_image_key", length = 500)
    private String profileImageKey;

    @Column(name = "default_address_id")
    private UUID defaultAddressId;

    protected Customer() {
    }

    public static Customer createInitial(UUID userCredentialId, String email) {
        Customer customer = new Customer();
        customer.userCredentialId = userCredentialId;
        customer.fullName = "Customer";
        customer.email = email;
        return customer;
    }

    public void updateProfile(String fullName, String email) {
        this.fullName = fullName;
        this.email = email;
    }

    public void setDefaultAddressId(UUID addressId) {
        this.defaultAddressId = addressId;
    }

    public void clearDefaultAddress() {
        this.defaultAddressId = null;
    }

    public void setProfileImageKey(String profileImageKey) {
        this.profileImageKey = profileImageKey;
    }

    public UUID getUserCredentialId() {
        return userCredentialId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getProfileImageKey() {
        return profileImageKey;
    }

    public UUID getDefaultAddressId() {
        return defaultAddressId;
    }
}
