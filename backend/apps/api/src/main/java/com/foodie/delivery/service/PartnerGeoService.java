package com.foodie.delivery.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PartnerGeoService {

    record GeoPartnerHit(UUID partnerId, double distanceKm) {
    }

    void addLocation(UUID partnerId, double latitude, double longitude);

    Optional<GeoPartnerHit> findNearestOnline(double latitude, double longitude, double radiusKm);

    List<GeoPartnerHit> findNearby(double latitude, double longitude, double radiusKm);
}
