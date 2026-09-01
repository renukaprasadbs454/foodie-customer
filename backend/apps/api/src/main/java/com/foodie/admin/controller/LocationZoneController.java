package com.foodie.admin.controller;

import com.foodie.admin.dto.LocationZoneDto;
import com.foodie.admin.dto.UnserviceableRequestDto;
import com.foodie.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/admin/location")
public class LocationZoneController {

    private final ConcurrentHashMap<String, LocationZoneDto> zones = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, UnserviceableRequestDto> unserviceableRequests = new ConcurrentHashMap<>();

    public LocationZoneController() {
        // Seed default multi-zones with coordinates & 3-way toggle flags
        LocationZoneDto z1 = new LocationZoneDto(
                "dz-301",
                "Indiranagar Tech Hub Zone",
                "Bangalore",
                12.9716,
                77.6412,
                5.0,
                "12.9716,77.6412 | 12.9800,77.6500 | 12.9600,77.6600",
                42,
                new BigDecimal("1.00"),
                "ACTIVE",
                true,
                true,
                true
        );

        LocationZoneDto z2 = new LocationZoneDto(
                "dz-302",
                "Koramangala Food Strip Zone",
                "Bangalore",
                12.9352,
                77.6245,
                4.5,
                "12.9352,77.6245 | 12.9450,77.6300 | 12.9200,77.6150",
                58,
                new BigDecimal("1.25"),
                "HIGH_DEMAND",
                true,
                true,
                true
        );

        LocationZoneDto z3 = new LocationZoneDto(
                "dz-303",
                "Bandra Coastal Eats Zone",
                "Mumbai",
                19.0596,
                72.8295,
                6.0,
                "19.0596,72.8295 | 19.0700,72.8400 | 19.0450,72.8200",
                65,
                new BigDecimal("1.10"),
                "ACTIVE",
                true,
                true,
                false // Customer ordering paused temporarily
        );

        LocationZoneDto z4 = new LocationZoneDto(
                "dz-304",
                "HSR Sector 1 Express Zone",
                "Bangalore",
                12.9121,
                77.6446,
                4.0,
                "12.9121,77.6446 | 12.9200,77.6500 | 12.9000,77.6350",
                28,
                new BigDecimal("1.00"),
                "ACTIVE",
                true,
                false, // Delivery partners paused temporarily
                true
        );

        zones.put(z1.getId(), z1);
        zones.put(z2.getId(), z2);
        zones.put(z3.getId(), z3);
        zones.put(z4.getId(), z4);

        // Seed unserviceable location requests from restaurants
        UnserviceableRequestDto r1 = new UnserviceableRequestDto(
                "req-501",
                "Truffles Bistro",
                "Rohan Sharma",
                "rohan@truffles.com",
                "+91 9876543210",
                "100 Feet Road, Whitefield",
                "Bangalore",
                12.9698,
                77.7499,
                "PENDING",
                Instant.now().minusSeconds(86400 * 2)
        );

        UnserviceableRequestDto r2 = new UnserviceableRequestDto(
                "req-502",
                "Coastal Spice House",
                "Ananya Rao",
                "ananya@coastalspice.com",
                "+91 9812345678",
                "Linking Road, Juhu",
                "Mumbai",
                19.1075,
                72.8263,
                "PENDING",
                Instant.now().minusSeconds(86400 * 4)
        );

        unserviceableRequests.put(r1.getId(), r1);
        unserviceableRequests.put(r2.getId(), r2);
    }

    @GetMapping("/zones")
    public ResponseEntity<ApiResponse<List<LocationZoneDto>>> getAllZones() {
        return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(zones.values())));
    }

    @PostMapping("/zones")
    public ResponseEntity<ApiResponse<LocationZoneDto>> createZone(@RequestBody LocationZoneDto dto) {
        if (dto.getId() == null || dto.getId().isBlank()) {
            dto.setId("dz-" + UUID.randomUUID().toString().substring(0, 6));
        }
        if (dto.getStatus() == null) {
            dto.setStatus("ACTIVE");
        }
        if (dto.getSurgeMultiplier() == null) {
            dto.getSurgeMultiplier();
            dto.setSurgeMultiplier(new BigDecimal("1.00"));
        }
        zones.put(dto.getId(), dto);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PatchMapping("/zones/{zoneId}/toggles")
    public ResponseEntity<ApiResponse<LocationZoneDto>> updateZoneToggles(
            @PathVariable String zoneId,
            @RequestParam(required = false) Boolean restaurantEnabled,
            @RequestParam(required = false) Boolean deliveryPartnerEnabled,
            @RequestParam(required = false) Boolean customerOrderingEnabled) {

        LocationZoneDto zone = zones.get(zoneId);
        if (zone == null) {
            return ResponseEntity.notFound().build();
        }

        if (restaurantEnabled != null) {
            zone.setRestaurantEnabled(restaurantEnabled);
        }
        if (deliveryPartnerEnabled != null) {
            zone.setDeliveryPartnerEnabled(deliveryPartnerEnabled);
        }
        if (customerOrderingEnabled != null) {
            zone.setCustomerOrderingEnabled(customerOrderingEnabled);
        }

        zones.put(zoneId, zone);
        return ResponseEntity.ok(ApiResponse.success(zone));
    }

    @GetMapping("/unserviceable-requests")
    public ResponseEntity<ApiResponse<List<UnserviceableRequestDto>>> getUnserviceableRequests() {
        return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(unserviceableRequests.values())));
    }

    @PostMapping("/unserviceable-requests")
    public ResponseEntity<ApiResponse<UnserviceableRequestDto>> createUnserviceableRequest(@RequestBody UnserviceableRequestDto dto) {
        if (dto.getId() == null || dto.getId().isBlank()) {
            dto.setId("req-" + UUID.randomUUID().toString().substring(0, 6));
        }
        dto.setStatus("PENDING");
        dto.setCreatedAt(Instant.now());
        unserviceableRequests.put(dto.getId(), dto);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PutMapping("/unserviceable-requests/{requestId}/status")
    public ResponseEntity<ApiResponse<UnserviceableRequestDto>> updateRequestStatus(
            @PathVariable String requestId,
            @RequestParam String status) {

        UnserviceableRequestDto req = unserviceableRequests.get(requestId);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }
        req.setStatus(status);
        unserviceableRequests.put(requestId, req);
        return ResponseEntity.ok(ApiResponse.success(req));
    }
}
