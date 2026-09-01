package com.foodie.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "foodie.jwt")
public record JwtProperties(
        String secret,
        long accessTokenTtlSeconds,
        long refreshTokenTtlCustomerSeconds,
        long refreshTokenTtlPartnerSeconds,
        long refreshTokenTtlAdminSeconds
) {
}
