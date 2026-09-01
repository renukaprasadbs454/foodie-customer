package com.foodie.delivery.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.KycStatus;
import com.foodie.common.enums.VehicleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "delivery_partner")
public class DeliveryPartner extends BaseEntity {

    @Column(name = "user_credential_id", nullable = false, unique = true, updatable = false)
    private UUID userCredentialId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 20)
    private VehicleType vehicleType;

    @Column(name = "vehicle_number", length = 20)
    private String vehicleNumber;

    @Column(name = "profile_image_key", length = 500)
    private String profileImageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false, length = 20)
    private KycStatus kycStatus;

    @Column(name = "is_online", nullable = false)
    private boolean online;

    protected DeliveryPartner() {
    }

    public static DeliveryPartner create(
            UUID userCredentialId,
            String fullName,
            VehicleType vehicleType,
            String vehicleNumber) {
        DeliveryPartner partner = new DeliveryPartner();
        partner.userCredentialId = userCredentialId;
        partner.fullName = fullName;
        partner.vehicleType = vehicleType;
        partner.vehicleNumber = vehicleNumber;
        partner.kycStatus = KycStatus.PENDING;
        partner.online = false;
        return partner;
    }

    public void updateProfile(String fullName, VehicleType vehicleType, String vehicleNumber) {
        this.fullName = fullName;
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
    }

    public void setProfileImageKey(String profileImageKey) {
        this.profileImageKey = profileImageKey;
    }

    public void setOnline(boolean online) {
        this.online = online;
    }

    public void verifyKyc() {
        this.kycStatus = KycStatus.VERIFIED;
    }

    public UUID getUserCredentialId() {
        return userCredentialId;
    }

    public String getFullName() {
        return fullName;
    }

    public VehicleType getVehicleType() {
        return vehicleType;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public String getProfileImageKey() {
        return profileImageKey;
    }

    public KycStatus getKycStatus() {
        return kycStatus;
    }

    public boolean isOnline() {
        return online;
    }
}
