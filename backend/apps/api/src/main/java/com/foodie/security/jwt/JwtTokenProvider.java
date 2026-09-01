package com.foodie.security.jwt;

import com.foodie.common.enums.UserType;
import com.foodie.security.principal.AuthPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final JwtProperties properties;
    private final SecretKey secretKey;

    public JwtTokenProvider(JwtProperties properties) {
        this.properties = properties;
        this.secretKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(UUID userId, UserType userType) {
        return createAccessToken(userId, userType, null);
    }

    /**
     * @param adminRole optional Admin role claim (SUPER_ADMIN / OPS / FINANCE / SUPPORT); ignored when null
     */
    public String createAccessToken(UUID userId, UserType userType, String adminRole) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(properties.accessTokenTtlSeconds());
        var builder = Jwts.builder()
                .subject(userId.toString())
                .claim("userType", userType.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry));
        if (adminRole != null && !adminRole.isBlank()) {
            builder.claim("adminRole", adminRole);
        }
        return builder.signWith(secretKey).compact();
    }

    public AuthPrincipal parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            UUID userId = UUID.fromString(claims.getSubject());
            UserType userType = UserType.valueOf(claims.get("userType", String.class));
            return new AuthPrincipal(userId, userType);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new JwtException("Invalid access token", ex);
        }
    }

    public long accessTokenTtlSeconds() {
        return properties.accessTokenTtlSeconds();
    }

    public long refreshTtlSeconds(UserType userType) {
        return switch (userType) {
            case CUSTOMER -> properties.refreshTokenTtlCustomerSeconds();
            case RESTAURANT, DELIVERY_PARTNER -> properties.refreshTokenTtlPartnerSeconds();
            case ADMIN -> properties.refreshTokenTtlAdminSeconds();
        };
    }
}
