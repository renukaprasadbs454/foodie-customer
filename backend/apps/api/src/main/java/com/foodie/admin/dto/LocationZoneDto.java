package com.foodie.admin.dto;

import java.math.BigDecimal;

public class LocationZoneDto {

    private String id;
    private String zoneName;
    private String cityName;
    private Double latitude;
    private Double longitude;
    private Double radiusKm;
    private String polygonCoordinates;
    private Integer activeDrivers;
    private BigDecimal surgeMultiplier;
    private String status; // ACTIVE, HIGH_DEMAND, PAUSED

    // 3-Way Toggles
    private boolean restaurantEnabled;
    private boolean deliveryPartnerEnabled;
    private boolean customerOrderingEnabled;

    public LocationZoneDto() {}

    public LocationZoneDto(
            String id,
            String zoneName,
            String cityName,
            Double latitude,
            Double longitude,
            Double radiusKm,
            String polygonCoordinates,
            Integer activeDrivers,
            BigDecimal surgeMultiplier,
            String status,
            boolean restaurantEnabled,
            boolean deliveryPartnerEnabled,
            boolean customerOrderingEnabled) {
        this.id = id;
        this.zoneName = zoneName;
        this.cityName = cityName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.radiusKm = radiusKm;
        this.polygonCoordinates = polygonCoordinates;
        this.activeDrivers = activeDrivers;
        this.surgeMultiplier = surgeMultiplier;
        this.status = status;
        this.restaurantEnabled = restaurantEnabled;
        this.deliveryPartnerEnabled = deliveryPartnerEnabled;
        this.customerOrderingEnabled = customerOrderingEnabled;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getZoneName() {
        return zoneName;
    }

    public void setZoneName(String zoneName) {
        this.zoneName = zoneName;
    }

    public String getCityName() {
        return cityName;
    }

    public void setCityName(String cityName) {
        this.cityName = cityName;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getRadiusKm() {
        return radiusKm;
    }

    public void setRadiusKm(Double radiusKm) {
        this.radiusKm = radiusKm;
    }

    public String getPolygonCoordinates() {
        return polygonCoordinates;
    }

    public void setPolygonCoordinates(String polygonCoordinates) {
        this.polygonCoordinates = polygonCoordinates;
    }

    public Integer getActiveDrivers() {
        return activeDrivers;
    }

    public void setActiveDrivers(Integer activeDrivers) {
        this.activeDrivers = activeDrivers;
    }

    public BigDecimal getSurgeMultiplier() {
        return surgeMultiplier;
    }

    public void setSurgeMultiplier(BigDecimal surgeMultiplier) {
        this.surgeMultiplier = surgeMultiplier;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isRestaurantEnabled() {
        return restaurantEnabled;
    }

    public void setRestaurantEnabled(boolean restaurantEnabled) {
        this.restaurantEnabled = restaurantEnabled;
    }

    public boolean isDeliveryPartnerEnabled() {
        return deliveryPartnerEnabled;
    }

    public void setDeliveryPartnerEnabled(boolean deliveryPartnerEnabled) {
        this.deliveryPartnerEnabled = deliveryPartnerEnabled;
    }

    public boolean isCustomerOrderingEnabled() {
        return customerOrderingEnabled;
    }

    public void setCustomerOrderingEnabled(boolean customerOrderingEnabled) {
        this.customerOrderingEnabled = customerOrderingEnabled;
    }
}
