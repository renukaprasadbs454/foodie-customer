package com.foodie.menu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.foodie.auth.CapturingSmsSender;
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

class MenuModuleIT extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private CapturingSmsSender capturingSmsSender;

    @Test
    void category_item_variant_and_publicMenu() {
        String token = signupRestaurant("+919833344455");
        HttpHeaders auth = bearer(token);

        ResponseEntity<Map> restaurant = restTemplate.exchange(
                "/api/v1/restaurants",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "name", "Menu Test Kitchen",
                        "cuisineTypes", List.of("SOUTH_INDIAN"),
                        "address", Map.of(
                                "line1", "1 Main",
                                "city", "Bengaluru",
                                "pincode", "560001",
                                "latitude", 12.97,
                                "longitude", 77.59
                        )
                ), auth),
                Map.class
        );
        assertThat(restaurant.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID restaurantId = UUID.fromString(
                ((Map<?, ?>) restaurant.getBody().get("data")).get("restaurantId").toString());

        ResponseEntity<Map> category = restTemplate.exchange(
                "/api/v1/menu/categories",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("name", "Starters", "displayOrder", 1), auth),
                Map.class
        );
        assertThat(category.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID categoryId = UUID.fromString(
                ((Map<?, ?>) category.getBody().get("data")).get("categoryId").toString());

        ResponseEntity<Map> item = restTemplate.exchange(
                "/api/v1/menu/items",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "categoryId", categoryId.toString(),
                        "name", "Paneer Tikka",
                        "description", "Grilled",
                        "basePrice", 220.00,
                        "isVeg", true
                ), auth),
                Map.class
        );
        assertThat(item.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID itemId = UUID.fromString(
                ((Map<?, ?>) item.getBody().get("data")).get("menuItemId").toString());

        ResponseEntity<Map> variant = restTemplate.exchange(
                "/api/v1/menu/items/" + itemId + "/variants",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("name", "Full", "priceDelta", 120.00), auth),
                Map.class
        );
        assertThat(variant.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<Map> availability = restTemplate.exchange(
                "/api/v1/menu/items/" + itemId + "/availability",
                HttpMethod.PATCH,
                new HttpEntity<>(Map.of("isAvailable", false), auth),
                Map.class
        );
        assertThat(availability.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Map<?, ?>) availability.getBody().get("data")).get("isAvailable")).isEqualTo(false);

        ResponseEntity<Map> menu = restTemplate.getForEntity(
                "/api/v1/menu/restaurants/" + restaurantId, Map.class);
        assertThat(menu.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> data = (Map<?, ?>) menu.getBody().get("data");
        assertThat(data.get("restaurantId").toString()).isEqualTo(restaurantId.toString());
        List<?> categories = (List<?>) data.get("categories");
        assertThat(categories).hasSize(1);
        Map<?, ?> cat = (Map<?, ?>) categories.getFirst();
        List<?> items = (List<?>) cat.get("items");
        assertThat(items).hasSize(1);
        Map<?, ?> menuItem = (Map<?, ?>) items.getFirst();
        assertThat(menuItem.get("isAvailable")).isEqualTo(false);
        assertThat((List<?>) menuItem.get("variants")).hasSize(1);
    }

    private String signupRestaurant(String phone) {
        restTemplate.postForEntity("/api/v1/auth/otp/request", Map.of("phoneNumber", phone), Map.class);
        await().atMost(Duration.ofSeconds(3)).until(() -> capturingSmsSender.lastOtp(phone) != null);
        ResponseEntity<Map> verify = restTemplate.postForEntity(
                "/api/v1/auth/otp/verify",
                Map.of(
                        "phoneNumber", phone,
                        "otp", capturingSmsSender.lastOtp(phone),
                        "userType", "RESTAURANT",
                        "deviceInfo", "menu-it"
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
