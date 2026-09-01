package com.foodie.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.foodie.support.AbstractIntegrationTest;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

class AuthModuleIT extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private CapturingSmsSender capturingSmsSender;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Test
    void otpLogin_refresh_and_logout_flow() {
        String phone = "+919876543210";

        ResponseEntity<Map> requestOtp = restTemplate.postForEntity(
                "/api/v1/auth/otp/request",
                Map.of("phoneNumber", phone),
                Map.class
        );
        assertThat(requestOtp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(requestOtp.getBody()).containsEntry("success", true);

        await().atMost(Duration.ofSeconds(3)).until(() -> capturingSmsSender.lastOtp(phone) != null);
        String otp = capturingSmsSender.lastOtp(phone);

        ResponseEntity<Map> verify = restTemplate.postForEntity(
                "/api/v1/auth/otp/verify",
                Map.of(
                        "phoneNumber", phone,
                        "otp", otp,
                        "userType", "CUSTOMER",
                        "deviceInfo", "test-device"
                ),
                Map.class
        );
        assertThat(verify.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> data = (Map<?, ?>) verify.getBody().get("data");
        assertThat(data.get("accessToken")).isNotNull();
        assertThat(data.get("refreshToken")).isNotNull();
        assertThat(data.get("userType")).isEqualTo("CUSTOMER");
        assertThat(data.get("isNewUser")).isEqualTo(true);
        assertThat(data.get("expiresIn")).isEqualTo(900);

        String refreshToken = data.get("refreshToken").toString();
        ResponseEntity<Map> refreshed = restTemplate.postForEntity(
                "/api/v1/auth/refresh",
                Map.of("refreshToken", refreshToken),
                Map.class
        );
        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> refreshedData = (Map<?, ?>) refreshed.getBody().get("data");
        String newAccess = refreshedData.get("accessToken").toString();
        String newRefresh = refreshedData.get("refreshToken").toString();
        assertThat(newRefresh).isNotEqualTo(refreshToken);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(newAccess);
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> logout = restTemplate.exchange(
                "/api/v1/auth/logout",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("refreshToken", newRefresh), headers),
                Map.class
        );
        assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<Map> reuse = restTemplate.postForEntity(
                "/api/v1/auth/refresh",
                Map.of("refreshToken", refreshToken),
                Map.class
        );
        assertThat(reuse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void adminLogin_refresh_logout_and_unauthorizedPaths() {
        ResponseEntity<Map> login = restTemplate.postForEntity(
                "/api/v1/auth/login",
                Map.of(
                        "email", "admin@foodie.local",
                        "password", "ChangeMe@123",
                        "deviceInfo", "it-admin"
                ),
                Map.class
        );
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(login.getBody()).containsEntry("success", true);
        Map<?, ?> data = (Map<?, ?>) login.getBody().get("data");
        assertThat(data.get("accessToken")).isNotNull();
        assertThat(data.get("refreshToken")).isNotNull();
        assertThat(data.get("userType")).isEqualTo("ADMIN");
        assertThat(data.get("role")).isEqualTo("SUPER_ADMIN");
        assertThat(data.get("userId")).isEqualTo("33333333-3333-3333-3333-333333333001");
        assertThat(data.get("isNewUser")).isEqualTo(false);

        String refreshToken = data.get("refreshToken").toString();
        String accessToken = data.get("accessToken").toString();

        ResponseEntity<Map> refreshed = restTemplate.postForEntity(
                "/api/v1/auth/refresh",
                Map.of("refreshToken", refreshToken),
                Map.class
        );
        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> refreshedData = (Map<?, ?>) refreshed.getBody().get("data");
        assertThat(refreshedData.get("userType")).isEqualTo("ADMIN");
        assertThat(refreshedData.get("role")).isEqualTo("SUPER_ADMIN");
        String newAccess = refreshedData.get("accessToken").toString();
        String newRefresh = refreshedData.get("refreshToken").toString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(newAccess);
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> me = restTemplate.exchange(
                "/api/v1/admin/users/me",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
        );
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> logout = restTemplate.exchange(
                "/api/v1/auth/logout",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("refreshToken", newRefresh), headers),
                Map.class
        );
        assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<Map> unauthorizedMe = restTemplate.exchange(
                "/api/v1/admin/users/me",
                HttpMethod.GET,
                new HttpEntity<>(new HttpHeaders()),
                Map.class
        );
        assertThat(unauthorizedMe.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<Map> badPassword = restTemplate.postForEntity(
                "/api/v1/auth/login",
                Map.of("email", "admin@foodie.local", "password", "WrongPass@1"),
                Map.class
        );
        assertThat(badPassword.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        Map<?, ?> badPasswordError = (Map<?, ?>) badPassword.getBody().get("error");
        assertThat(badPasswordError.get("code")).isEqualTo("UNAUTHORIZED");

        ResponseEntity<Map> unknownEmail = restTemplate.postForEntity(
                "/api/v1/auth/login",
                Map.of("email", "nobody@foodie.local", "password", "ChangeMe@123"),
                Map.class
        );
        assertThat(unknownEmail.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void adminLogin_disabledAccount_returnsAccountDeactivated() {
        jdbcTemplate.update(
                "UPDATE user_credential SET active = FALSE WHERE id = ?",
                java.util.UUID.fromString("33333333-3333-3333-3333-333333333001")
        );
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "/api/v1/auth/login",
                    Map.of("email", "admin@foodie.local", "password", "ChangeMe@123"),
                    Map.class
            );
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
            Map<?, ?> error = (Map<?, ?>) response.getBody().get("error");
            assertThat(error.get("code")).isEqualTo("ACCOUNT_DEACTIVATED");
        } finally {
            jdbcTemplate.update(
                    "UPDATE user_credential SET active = TRUE WHERE id = ?",
                    java.util.UUID.fromString("33333333-3333-3333-3333-333333333001")
            );
        }
    }

    @Test
    void requestOtp_invalidPhone_returnsValidationFailed() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                "/api/v1/auth/otp/request",
                Map.of("phoneNumber", "9876543210"),
                Map.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("success")).isEqualTo(false);
        Map<?, ?> error = (Map<?, ?>) response.getBody().get("error");
        assertThat(error.get("code")).isEqualTo("VALIDATION_FAILED");
    }
}
