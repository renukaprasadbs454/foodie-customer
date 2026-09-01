package com.foodie.restaurant.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "restaurant_address")
public class RestaurantAddress extends BaseEntity {

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

    @Column(name = "landmark")
    private String landmark;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "country", length = 100)
    private String country = "India";

    @Column(name = "formatted_address", length = 500)
    private String formattedAddress;

    protected RestaurantAddress() {
    }

    public static RestaurantAddress create(
            String line1,
            String line2,
            String city,
            String pincode,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        return create(line1, line2, null, city, null, "India", pincode, null, latitude, longitude);
    }

    public static RestaurantAddress create(
            String line1,
            String line2,
            String landmark,
            String city,
            String state,
            String country,
            String pincode,
            String formattedAddress,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        RestaurantAddress address = new RestaurantAddress();
        address.line1 = line1;
        address.line2 = line2;
        address.landmark = landmark;
        address.city = city;
        address.state = state;
        address.country = country != null ? country : "India";
        address.pincode = pincode;
        address.formattedAddress = formattedAddress;
        address.latitude = latitude;
        address.longitude = longitude;
        return address;
    }

    public void replace(
            String line1,
            String line2,
            String city,
            String pincode,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        this.line1 = line1;
        this.line2 = line2;
        this.city = city;
        this.pincode = pincode;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public void replace(
            String line1,
            String line2,
            String landmark,
            String city,
            String state,
            String country,
            String pincode,
            String formattedAddress,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        this.line1 = line1;
        this.line2 = line2;
        this.landmark = landmark;
        this.city = city;
        this.state = state;
        this.country = country != null ? country : "India";
        this.pincode = pincode;
        this.formattedAddress = formattedAddress;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public String getLine1() {
        return line1;
    }

    public String getLine2() {
        return line2;
    }

    public String getLandmark() {
        return landmark;
    }

    public String getCity() {
        return city;
    }

    public String getState() {
        return state;
    }

    public String getCountry() {
        return country;
    }

    public String getPincode() {
        return pincode;
    }

    public String getFormattedAddress() {
        return formattedAddress;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }
}
