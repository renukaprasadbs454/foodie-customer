package com.foodie.restaurant.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.RestaurantBusinessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "restaurant_legal_detail")
public class RestaurantLegalDetail extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false, unique = true)
    private Restaurant restaurant;

    @Column(name = "gstin", length = 20)
    private String gstin;

    @Column(name = "pan", length = 20)
    private String pan;

    @Column(name = "fssai_license_number", length = 30)
    private String fssaiLicenseNumber;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_type", nullable = false, length = 50)
    private RestaurantBusinessType businessType;

    @Column(name = "contact_email", nullable = false)
    private String contactEmail;

    @Column(name = "contact_phone", nullable = false, length = 20)
    private String contactPhone;

    protected RestaurantLegalDetail() {
    }

    public static RestaurantLegalDetail create(
            Restaurant restaurant,
            String gstin,
            String pan,
            String fssaiLicenseNumber,
            String legalName,
            RestaurantBusinessType businessType,
            String contactEmail,
            String contactPhone
    ) {
        RestaurantLegalDetail detail = new RestaurantLegalDetail();
        detail.restaurant = restaurant;
        detail.gstin = gstin;
        detail.pan = pan;
        detail.fssaiLicenseNumber = fssaiLicenseNumber;
        detail.legalName = legalName;
        detail.businessType = businessType;
        detail.contactEmail = contactEmail;
        detail.contactPhone = contactPhone;
        return detail;
    }

    public void update(
            String gstin,
            String pan,
            String fssaiLicenseNumber,
            String legalName,
            RestaurantBusinessType businessType,
            String contactEmail,
            String contactPhone
    ) {
        this.gstin = gstin;
        this.pan = pan;
        this.fssaiLicenseNumber = fssaiLicenseNumber;
        this.legalName = legalName;
        this.businessType = businessType;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public String getGstin() {
        return gstin;
    }

    public String getPan() {
        return pan;
    }

    public String getFssaiLicenseNumber() {
        return fssaiLicenseNumber;
    }

    public String getLegalName() {
        return legalName;
    }

    public RestaurantBusinessType getBusinessType() {
        return businessType;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }
}
