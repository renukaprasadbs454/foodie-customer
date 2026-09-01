package com.foodie.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.foodie.auth.CapturingSmsSender;
import com.foodie.order.service.OrderService;
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

class OrderModuleIT extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private CapturingSmsSender capturingSmsSender;

    @Autowired
    private RestaurantService restaurantService;

    @Autowired
    private OrderService orderService;

    @Test
    void placeOrder_idempotentReplay_cancel_andRestaurantQueue() {
        String customerToken = signup("+919900011122", "CUSTOMER");
        HttpHeaders customerAuth = bearer(customerToken);

        UUID restaurantId = createApprovedRestaurant("+919900022233", "Order Rest");
        String restaurantToken = signupExisting("+919900022233");
        HttpHeaders restaurantAuth = bearer(restaurantToken);
        UUID menuItemId = createMenuItem(restaurantToken, "Biryani", 200.00);

        UUID addressId = addAddress(customerAuth);

        restTemplate.exchange(
                "/api/v1/cart/items",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("menuItemId", menuItemId.toString(), "quantity", 2), customerAuth),
                Map.class
        );

        String idempotencyKey = UUID.randomUUID().toString();
        HttpHeaders placeHeaders = bearer(customerToken);
        placeHeaders.set("Idempotency-Key", idempotencyKey);

        ResponseEntity<Map> placed = restTemplate.exchange(
                "/api/v1/orders",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("addressId", addressId.toString()), placeHeaders),
                Map.class
        );
        assertThat(placed.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<?, ?> data = (Map<?, ?>) placed.getBody().get("data");
        assertThat(data.get("status")).isEqualTo("PLACED");
        assertThat(data.get("orderNumber").toString()).startsWith("FD-");
        assertThat(data.get("subtotal").toString()).isIn("400.0", "400.00");
        UUID orderId = UUID.fromString(data.get("orderId").toString());

        ResponseEntity<Map> cartAfter = restTemplate.exchange(
                "/api/v1/cart", HttpMethod.GET, new HttpEntity<>(customerAuth), Map.class);
        assertThat((List<?>) ((Map<?, ?>) cartAfter.getBody().get("data")).get("items")).isEmpty();

        ResponseEntity<Map> replay = restTemplate.exchange(
                "/api/v1/orders",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("addressId", addressId.toString()), placeHeaders),
                Map.class
        );
        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(((Map<?, ?>) replay.getBody().get("data")).get("orderId").toString())
                .isEqualTo(orderId.toString());

        HttpHeaders reusedHeaders = bearer(customerToken);
        reusedHeaders.set("Idempotency-Key", idempotencyKey);
        UUID otherAddress = addAddress(customerAuth);
        ResponseEntity<Map> reused = restTemplate.exchange(
                "/api/v1/orders",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("addressId", otherAddress.toString()), reusedHeaders),
                Map.class
        );
        assertThat(reused.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(((Map<?, ?>) reused.getBody().get("error")).get("code"))
                .isEqualTo("IDEMPOTENCY_KEY_REUSED");

        ResponseEntity<Map> missingKey = restTemplate.exchange(
                "/api/v1/orders",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("addressId", addressId.toString()), customerAuth),
                Map.class
        );
        assertThat(missingKey.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // Payment module not present — SYSTEM confirm path for restaurant queue tests
        orderService.confirmAfterPayment(orderId);

        ResponseEntity<Map> queue = restTemplate.exchange(
                "/api/v1/orders/restaurant?status=CONFIRMED",
                HttpMethod.GET,
                new HttpEntity<>(restaurantAuth),
                Map.class
        );
        assertThat(queue.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<?>) queue.getBody().get("data")).isNotEmpty();
        assertThat(restaurantId).isNotNull();

        ResponseEntity<Map> accepted = restTemplate.exchange(
                "/api/v1/orders/" + orderId + "/status",
                HttpMethod.PATCH,
                new HttpEntity<>(Map.of("targetStatus", "ACCEPTED"), restaurantAuth),
                Map.class
        );
        assertThat(accepted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Map<?, ?>) accepted.getBody().get("data")).get("status")).isEqualTo("ACCEPTED");

        // Second order for customer cancel-from-PLACED
        restTemplate.exchange(
                "/api/v1/cart/items",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("menuItemId", menuItemId.toString(), "quantity", 1), customerAuth),
                Map.class
        );
        String key2 = UUID.randomUUID().toString();
        HttpHeaders place2 = bearer(customerToken);
        place2.set("Idempotency-Key", key2);
        ResponseEntity<Map> placed2 = restTemplate.exchange(
                "/api/v1/orders",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("addressId", addressId.toString()), place2),
                Map.class
        );
        UUID order2 = UUID.fromString(((Map<?, ?>) placed2.getBody().get("data")).get("orderId").toString());

        ResponseEntity<Map> cancelled = restTemplate.exchange(
                "/api/v1/orders/" + order2 + "/status",
                HttpMethod.PATCH,
                new HttpEntity<>(Map.of("targetStatus", "CANCELLED", "reason", "Changed mind"), customerAuth),
                Map.class
        );
        assertThat(cancelled.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> cancelledData = (Map<?, ?>) cancelled.getBody().get("data");
        assertThat(cancelledData.get("status")).isEqualTo("CANCELLED");
        assertThat((List<?>) cancelledData.get("orderStatusEvents")).hasSizeGreaterThanOrEqualTo(2);

        ResponseEntity<Map> history = restTemplate.exchange(
                "/api/v1/orders/me",
                HttpMethod.GET,
                new HttpEntity<>(customerAuth),
                Map.class
        );
        assertThat(history.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<?>) history.getBody().get("data")).hasSizeGreaterThanOrEqualTo(2);
    }

    private UUID addAddress(HttpHeaders auth) {
        ResponseEntity<Map> created = restTemplate.exchange(
                "/api/v1/users/me/addresses",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "label", "Home",
                        "line1", "1 Main St",
                        "city", "Bengaluru",
                        "pincode", "560001",
                        "latitude", 12.97,
                        "longitude", 77.59,
                        "isDefault", true
                ), auth),
                Map.class
        );
        return UUID.fromString(((Map<?, ?>) created.getBody().get("data")).get("addressId").toString());
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

    private UUID createMenuItem(String restaurantToken, String itemName, double price) {
        HttpHeaders auth = bearer(restaurantToken);
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
                        "deviceInfo", "order-it"
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
                        "deviceInfo", "order-it-2"
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
