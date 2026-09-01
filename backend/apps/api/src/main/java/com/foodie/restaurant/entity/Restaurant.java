package com.foodie.restaurant.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.RestaurantStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "restaurant")
public class Restaurant extends BaseEntity {

    @Column(name = "owner_user_credential_id", nullable = false, unique = true, updatable = false)
    private UUID ownerUserCredentialId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "cuisine_types", nullable = false)
    private String[] cuisineTypes;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "address_id", nullable = false)
    private RestaurantAddress address;

    @Column(name = "latitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "logo_image_key", length = 500)
    private String logoImageKey;

    @Column(name = "cover_image_key", length = 500)
    private String coverImageKey;

    @Column(name = "avg_rating", nullable = false, precision = 2, scale = 1)
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RestaurantStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "restaurant_type", length = 30)
    private com.foodie.common.enums.RestaurantType restaurantType = com.foodie.common.enums.RestaurantType.BOTH;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "commission_pct", nullable = false, precision = 4, scale = 2)
    private BigDecimal commissionPct;

    @Column(name = "upi_id", length = 100)
    private String upiId;

    @Column(name = "upi_name", length = 150)
    private String upiName;

    @Column(name = "upi_verified")
    private Boolean upiVerified = Boolean.FALSE;

    @Column(name = "upi_verified_at")
    private java.time.Instant upiVerifiedAt;

    protected Restaurant() {
    }

    public static Restaurant createPending(
            UUID ownerUserCredentialId,
            String name,
            String description,
            String[] cuisineTypes,
            RestaurantAddress address,
            BigDecimal commissionPct) {
        return createPending(ownerUserCredentialId, name, description, cuisineTypes,
                com.foodie.common.enums.RestaurantType.BOTH, address, commissionPct);
    }

    public static Restaurant createPending(
            UUID ownerUserCredentialId,
            String name,
            String description,
            String[] cuisineTypes,
            com.foodie.common.enums.RestaurantType restaurantType,
            RestaurantAddress address,
            BigDecimal commissionPct) {
        Restaurant restaurant = new Restaurant();
        restaurant.ownerUserCredentialId = ownerUserCredentialId;
        restaurant.name = name;
        restaurant.description = description;
        restaurant.cuisineTypes = cuisineTypes;
        restaurant.restaurantType = restaurantType != null ? restaurantType
                : com.foodie.common.enums.RestaurantType.BOTH;
        restaurant.address = address;
        restaurant.latitude = address.getLatitude();
        restaurant.longitude = address.getLongitude();
        restaurant.avgRating = BigDecimal.ZERO.setScale(1);
        restaurant.status = RestaurantStatus.PENDING;
        restaurant.commissionPct = commissionPct;
        return restaurant;
    }

    public void updateProfile(String name, String description, String[] cuisineTypes) {
        updateProfile(name, description, cuisineTypes, null);
    }

    public void updateProfile(String name, String description, String[] cuisineTypes,
            com.foodie.common.enums.RestaurantType restaurantType) {
        this.name = name;
        this.description = description;
        this.cuisineTypes = cuisineTypes;
        if (restaurantType != null) {
            this.restaurantType = restaurantType;
        }
    }

    public void syncGeoFromAddress() {
        this.latitude = address.getLatitude();
        this.longitude = address.getLongitude();
    }

    public void approve() {
        this.status = RestaurantStatus.APPROVED;
        this.rejectionReason = null;
    }

    public void suspend() {
        this.status = RestaurantStatus.SUSPENDED;
    }

    public void reject(String reason) {
        this.status = RestaurantStatus.REJECTED;
        this.rejectionReason = reason;
    }

    public void resubmit() {
        this.status = RestaurantStatus.PENDING;
        this.rejectionReason = null;
    }

    public void setLogoImageKey(String logoImageKey) {
        this.logoImageKey = logoImageKey;
    }

    public void setCoverImageKey(String coverImageKey) {
        this.coverImageKey = coverImageKey;
    }

    /** Denormalized cache — Restaurant owns this write (Phase3 §2.11). */
    public void updateAvgRating(BigDecimal avgRating) {
        this.avgRating = avgRating == null
                ? BigDecimal.ZERO.setScale(1)
                : avgRating.setScale(1, java.math.RoundingMode.HALF_UP);
    }

    public UUID getOwnerUserCredentialId() {
        return ownerUserCredentialId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String[] getCuisineTypes() {
        return cuisineTypes;
    }

    public com.foodie.common.enums.RestaurantType getRestaurantType() {
        return restaurantType;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public RestaurantAddress getAddress() {
        return address;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public String getLogoImageKey() {
        return logoImageKey;
    }

    public String getCoverImageKey() {
        return coverImageKey;
    }

    public BigDecimal getAvgRating() {
        return avgRating;
    }

    public RestaurantStatus getStatus() {
        return status;
    }

    public BigDecimal getCommissionPct() {
        return commissionPct;
    }

    public void updateUpi(String upiId, String upiName) {
        this.upiId = upiId;
        this.upiName = upiName;
        this.upiVerified = false;
        this.upiVerifiedAt = null;
    }

    public void verifyUpi() {
        this.upiVerified = true;
        this.upiVerifiedAt = java.time.Instant.now();
    }

    public String getUpiId() {
        return upiId;
    }

    public String getUpiName() {
        return upiName;
    }

    public boolean isUpiVerified() {
        return Boolean.TRUE.equals(upiVerified);
    }

    public java.time.Instant getUpiVerifiedAt() {
        return upiVerifiedAt;
    }
}
