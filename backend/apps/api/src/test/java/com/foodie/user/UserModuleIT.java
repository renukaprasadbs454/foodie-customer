package com.foodie.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.foodie.auth.CapturingSmsSender;
import com.foodie.support.AbstractIntegrationTest;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

class UserModuleIT extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private CapturingSmsSender capturingSmsSender;

    @Test
    void profile_addresses_and_profileImage_flow() {
        String accessToken = signupCustomer("+919811122233");

        HttpHeaders auth = bearer(accessToken);

        ResponseEntity<Map> profile = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.GET,
                new HttpEntity<>(auth),
                Map.class
        );
        assertThat(profile.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> profileData = (Map<?, ?>) profile.getBody().get("data");
        assertThat(profileData.get("customerId")).isNotNull();
        assertThat(profileData.get("fullName")).isEqualTo("Customer");
        assertThat(profileData.get("phoneNumber")).isEqualTo("+919811122233");

        ResponseEntity<Map> updated = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.PUT,
                new HttpEntity<>(
                        Map.of("fullName", "Ananya Rao", "email", "ananya.rao@example.com"),
                        auth
                ),
                Map.class
        );
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> updatedData = (Map<?, ?>) updated.getBody().get("data");
        assertThat(updatedData.get("fullName")).isEqualTo("Ananya Rao");
        assertThat(updatedData.get("email")).isEqualTo("ananya.rao@example.com");

        ResponseEntity<Map> createdAddress = restTemplate.exchange(
                "/api/v1/users/me/addresses",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of(
                                "label", "Home",
                                "line1", "Flat 402, Prestige Falcon Towers",
                                "line2", "Kadubeesanahalli",
                                "city", "Bengaluru",
                                "pincode", "560103",
                                "latitude", 12.9352,
                                "longitude", 77.6912,
                                "isDefault", true
                        ),
                        auth
                ),
                Map.class
        );
        assertThat(createdAddress.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<?, ?> addressData = (Map<?, ?>) createdAddress.getBody().get("data");
        assertThat(addressData.get("addressId")).isNotNull();
        assertThat(addressData.get("isDefault")).isEqualTo(true);
        String addressId = addressData.get("addressId").toString();

        ResponseEntity<Map> listed = restTemplate.exchange(
                "/api/v1/users/me/addresses",
                HttpMethod.GET,
                new HttpEntity<>(auth),
                Map.class
        );
        assertThat(listed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<?>) listed.getBody().get("data")).hasSize(1);

        ResponseEntity<Map> afterAddress = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.GET,
                new HttpEntity<>(auth),
                Map.class
        );
        assertThat(((Map<?, ?>) afterAddress.getBody().get("data")).get("defaultAddressId")).isEqualTo(addressId);

        byte[] png = new byte[] {
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4
        };
        MultiValueMap<String, Object> multipart = new LinkedMultiValueMap<>();
        ByteArrayResource resource = new ByteArrayResource(png) {
            @Override
            public String getFilename() {
                return "avatar.png";
            }
        };
        multipart.add("file", resource);
        HttpHeaders multipartHeaders = bearer(accessToken);
        multipartHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
        ResponseEntity<Map> upload = restTemplate.exchange(
                "/api/v1/users/me/profile-image",
                HttpMethod.POST,
                new HttpEntity<>(multipart, multipartHeaders),
                Map.class
        );
        assertThat(upload.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<?, ?> uploadData = (Map<?, ?>) upload.getBody().get("data");
        assertThat(uploadData.get("fileKey").toString()).contains("/profile/");
        assertThat(uploadData.get("uploadedAt")).isNotNull();

        ResponseEntity<Map> deleted = restTemplate.exchange(
                "/api/v1/users/me/addresses/" + addressId,
                HttpMethod.DELETE,
                new HttpEntity<>(auth),
                Map.class
        );
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<Map> listedAfterDelete = restTemplate.exchange(
                "/api/v1/users/me/addresses",
                HttpMethod.GET,
                new HttpEntity<>(auth),
                Map.class
        );
        assertThat((List<?>) listedAfterDelete.getBody().get("data")).isEmpty();

        ResponseEntity<Map> profileAfterDelete = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.GET,
                new HttpEntity<>(auth),
                Map.class
        );
        assertThat(((Map<?, ?>) profileAfterDelete.getBody().get("data")).get("defaultAddressId")).isNull();
    }

    private String signupCustomer(String phone) {
        restTemplate.postForEntity("/api/v1/auth/otp/request", Map.of("phoneNumber", phone), Map.class);
        await().atMost(Duration.ofSeconds(3)).until(() -> capturingSmsSender.lastOtp(phone) != null);
        String otp = capturingSmsSender.lastOtp(phone);
        ResponseEntity<Map> verify = restTemplate.postForEntity(
                "/api/v1/auth/otp/verify",
                Map.of(
                        "phoneNumber", phone,
                        "otp", otp,
                        "userType", "CUSTOMER",
                        "deviceInfo", "user-it"
                ),
                Map.class
        );
        assertThat(verify.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> data = (Map<?, ?>) verify.getBody().get("data");
        return data.get("accessToken").toString();
    }

    private static HttpHeaders bearer(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }
}
