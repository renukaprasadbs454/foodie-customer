package com.foodie.user.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "address")
@SQLRestriction("\"deleted_at\" IS NULL")
public class Address extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false, updatable = false)
    private Customer customer;

    @Column(name = "recipient_name", length = 100)
    private String recipientName;

    @Column(name = "recipient_phone", length = 20)
    private String recipientPhone;

    @Column(name = "house_flat_no", length = 100)
    private String houseFlatNo;

    @Column(name = "landmark")
    private String landmark;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "label", length = 50)
    private String label;

    @Column(name = "line1", nullable = false)
    private String line1;

    @Column(name = "line2")
    private String line2;

    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @Column(name = "pincode", nullable = false, length = 10)
    private String pincode;

    @Column(name = "latitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Address() {
    }

    public static Address create(
            Customer customer,
            String recipientName,
            String recipientPhone,
            String houseFlatNo,
            String landmark,
            String state,
            String label,
            String line1,
            String line2,
            String city,
            String pincode,
            BigDecimal latitude,
            BigDecimal longitude,
            boolean isDefault) {
        Address address = new Address();
        address.customer = customer;
        address.recipientName = recipientName;
        address.recipientPhone = recipientPhone;
        address.houseFlatNo = houseFlatNo;
        address.landmark = landmark;
        address.state = state;
        address.label = label;
        address.line1 = line1;
        address.line2 = line2;
        address.city = city;
        address.pincode = pincode;
        address.latitude = latitude;
        address.longitude = longitude;
        address.isDefault = isDefault;
        return address;
    }

    public static Address create(
            Customer customer,
            String label,
            String line1,
            String line2,
            String city,
            String pincode,
            BigDecimal latitude,
            BigDecimal longitude,
            boolean isDefault) {
        return create(customer, null, null, null, null, null, label, line1, line2, city, pincode, latitude, longitude,
                isDefault);
    }

    public void update(
            String recipientName,
            String recipientPhone,
            String houseFlatNo,
            String landmark,
            String state,
            String label,
            String line1,
            String line2,
            String city,
            String pincode,
            BigDecimal latitude,
            BigDecimal longitude) {
        this.recipientName = recipientName;
        this.recipientPhone = recipientPhone;
        this.houseFlatNo = houseFlatNo;
        this.landmark = landmark;
        this.state = state;
        this.label = label;
        this.line1 = line1;
        this.line2 = line2;
        this.city = city;
        this.pincode = pincode;
        if (latitude != null)
            this.latitude = latitude;
        if (longitude != null)
            this.longitude = longitude;
    }

    public void clearDefault() {
        this.isDefault = false;
    }

    public void markDefault() {
        this.isDefault = true;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
        this.isDefault = false;
    }

    public Customer getCustomer() {
        return customer;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public String getRecipientPhone() {
        return recipientPhone;
    }

    public String getHouseFlatNo() {
        return houseFlatNo;
    }

    public String getLandmark() {
        return landmark;
    }

    public String getState() {
        return state;
    }

    public String getLabel() {
        return label;
    }

    public String getLine1() {
        return line1;
    }

    public String getLine2() {
        return line2;
    }

    public String getCity() {
        return city;
    }

    public String getPincode() {
        return pincode;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }
}
