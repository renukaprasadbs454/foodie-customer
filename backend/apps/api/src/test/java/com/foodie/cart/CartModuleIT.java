package com.foodie.cart;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.foodie.auth.CapturingSmsSender;
import com.foodie.restaurant.service.RestaurantService;
import com.foodie.support.AbstractIntegrationTest;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

class CartModuleIT extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private CapturingSmsSender capturingSmsSender;

    @Autowired
    private RestaurantService restaurantService;

    @Test
    void getOrCreate_add_conflict_clear_flow() {
        String customerToken = signup("+919844455566", "CUSTOMER");
        HttpHeaders customerAuth = bearer(customerToken);

        ResponseEntity<Map> empty = restTemplate.exchange(
                "/api/v1/cart", HttpMethod.GET, new HttpEntity<>(customerAuth), Map.class);
        assertThat(empty.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> emptyData = (Map<?, ?>) empty.getBody().get("data");
        assertThat(emptyData.get("restaurantId")).isNull();
        assertThat((List<?>) emptyData.get("items")).isEmpty();

        UUID restaurantA = createApprovedRestaurant("+919855566677", "Cart Rest A");
        UUID restaurantB = createApprovedRestaurant("+919866677788", "Cart Rest B");
        UUID itemA = createMenuItem("+919855566677", "Item A", 100.00);
        UUID itemB = createMenuItem("+919866677788", "Item B", 50.00);

        ResponseEntity<Map> added = restTemplate.exchange(
                "/api/v1/cart/items",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("menuItemId", itemA.toString(), "quantity", 2), customerAuth),
                Map.class
        );
        assertThat(added.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> addedData = (Map<?, ?>) added.getBody().get("data");
        assertThat(addedData.get("restaurantId").toString()).isEqualTo(restaurantA.toString());
        assertThat(addedData.get("subtotal").toString()).isIn("200.0", "200.00");

        ResponseEntity<Map> conflict = restTemplate.exchange(
                "/api/v1/cart/items",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("menuItemId", itemB.toString(), "quantity", 1), customerAuth),
                Map.class
        );
        assertThat(conflict.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(((Map<?, ?>) conflict.getBody().get("error")).get("code"))
                .isEqualTo("CART_RESTAURANT_CONFLICT");
        assertThat(((Map<?, ?>) conflict.getBody().get("data")).get("suggestedAction"))
                .isEqualTo("CLEAR_CART");

        ResponseEntity<Map> cleared = restTemplate.exchange(
                "/api/v1/cart", HttpMethod.DELETE, new HttpEntity<>(customerAuth), Map.class);
        assertThat(cleared.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<Map> afterClear = restTemplate.exchange(
                "/api/v1/cart", HttpMethod.GET, new HttpEntity<>(customerAuth), Map.class);
        assertThat(((Map<?, ?>) afterClear.getBody().get("data")).get("restaurantId")).isNull();
        assertThat(restaurantB).isNotNull();
    }

    private UUID createApprovedRestaurant(String phone, String name) {
        String token = signup(phone, "RESTAURANT");
        HttpHeaders auth = bearer(token);
        ResponseEntity<Map> created = restTemplate.exchange(
                "/api/v1/restaurants",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "name", name,
                        "cuisineTypes", List.of("SOUTH_INDIAN"),
                        "address", Map.of(
                                "line1", "1 St",
                                "city", "Bengaluru",
                                "pincode", "560001",
                                "latitude", 12.97,
                                "longitude", 77.59
                        )
                ), auth),
                Map.class
        );
        UUID restaurantId = UUID.fromString(
                ((Map<?, ?>) created.getBody().get("data")).get("restaurantId").toString());
        restaurantService.approve(restaurantId, UUID.randomUUID());
        return restaurantId;
    }

    private UUID createMenuItem(String restaurantPhone, String itemName, double price) {
        String token = signupExisting(restaurantPhone);
        HttpHeaders auth = bearer(token);
        ResponseEntity<Map> category = restTemplate.exchange(
                "/api/v1/menu/categories",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("name", "Mains"), auth),
                Map.class
        );
        UUID categoryId = UUID.fromString(
                ((Map<?, ?>) category.getBody().get("data")).get("categoryId").toString());
        ResponseEntity<Map> item = restTemplate.exchange(
                "/api/v1/menu/items",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "categoryId", categoryId.toString(),
                        "name", itemName,
                        "basePrice", price,
                        "isVeg", true
                ), auth),
                Map.class
        );
        return UUID.fromString(((Map<?, ?>) item.getBody().get("data")).get("menuItemId").toString());
    }

    private String signup(String phone, String userType) {
        restTemplate.postForEntity("/api/v1/auth/otp/request", Map.of("phoneNumber", phone), Map.class);
        await().atMost(Duration.ofSeconds(3)).until(() -> capturingSmsSender.lastOtp(phone) != null);
        ResponseEntity<Map> verify = restTemplate.postForEntity(
                "/api/v1/auth/otp/verify",
                Map.of(
                        "phoneNumber", phone,
                        "otp", capturingSmsSender.lastOtp(phone),
                        "userType", userType,
                        "deviceInfo", "cart-it"
                ),
                Map.class
        );
        return ((Map<?, ?>) verify.getBody().get("data")).get("accessToken").toString();
    }

    private String signupExisting(String phone) {
        restTemplate.postForEntity("/api/v1/auth/otp/request", Map.of("phoneNumber", phone), Map.class);
        await().atMost(Duration.ofSeconds(3)).until(() -> capturingSmsSender.lastOtp(phone) != null);
        ResponseEntity<Map> verify = restTemplate.postForEntity(
                "/api/v1/auth/otp/verify",
                Map.of(
                        "phoneNumber", phone,
                        "otp", capturingSmsSender.lastOtp(phone),
                        "deviceInfo", "cart-it-2"
                ),
                Map.class
        );
        return ((Map<?, ?>) verify.getBody().get("data")).get("accessToken").toString();
    }

    private static HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }
}
