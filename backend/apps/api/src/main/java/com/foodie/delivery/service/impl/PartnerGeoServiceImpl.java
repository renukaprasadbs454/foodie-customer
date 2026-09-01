package com.foodie.delivery.service.impl;

import com.foodie.delivery.service.PartnerGeoService.GeoPartnerHit;
import com.foodie.delivery.service.PartnerGeoService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class PartnerGeoServiceImpl implements PartnerGeoService {

    static final String GEO_KEY = "geo:partners";

    private final StringRedisTemplate redisTemplate;

    public PartnerGeoServiceImpl(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void addLocation(UUID partnerId, double latitude, double longitude) {
        String member = partnerId.toString();
        redisTemplate.opsForGeo().add(GEO_KEY, new Point(longitude, latitude), member);
        String lastSeenKey = lastSeenKey(partnerId);
        redisTemplate.opsForHash().putAll(lastSeenKey, Map.of(
                "lat", String.valueOf(latitude),
                "lng", String.valueOf(longitude),
                "ts", String.valueOf(Instant.now().toEpochMilli())
        ));
    }

    @Override
    public Optional<GeoPartnerHit> findNearestOnline(double latitude, double longitude, double radiusKm) {
        return findNearby(latitude, longitude, radiusKm).stream().findFirst();
    }

    @Override
    public List<GeoPartnerHit> findNearby(double latitude, double longitude, double radiusKm) {
        GeoResults<RedisGeoCommands.GeoLocation<String>> results = redisTemplate.opsForGeo().radius(
                GEO_KEY,
                new Circle(new Point(longitude, latitude), new Distance(radiusKm, Metrics.KILOMETERS)),
                RedisGeoCommands.GeoRadiusCommandArgs.newGeoRadiusArgs()
                        .sortAscending()
                        .includeDistance()
        );
        if (results == null) {
            return List.of();
        }
        List<GeoPartnerHit> hits = new ArrayList<>();
        results.forEach(result -> {
            String member = result.getContent().getName();
            Double distanceKm = result.getDistance() == null ? null : result.getDistance().getValue();
            hits.add(new GeoPartnerHit(UUID.fromString(member), distanceKm == null ? 0.0 : distanceKm));
        });
        return hits;
    }

    static String lastSeenKey(UUID partnerId) {
        return "partner:" + partnerId + ":lastSeen";
    }
}
