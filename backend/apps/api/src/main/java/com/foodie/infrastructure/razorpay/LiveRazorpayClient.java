package com.foodie.infrastructure.razorpay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.exception.ExternalServiceException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Live Razorpay Orders / Refunds HTTP adapter (Phase3 §8.2 / §8.4).
 */
public class LiveRazorpayClient implements RazorpayClient {

    private static final Logger log = LoggerFactory.getLogger(LiveRazorpayClient.class);

    private final RazorpayProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public LiveRazorpayClient(RazorpayProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        String basic = Base64.getEncoder().encodeToString(
                (properties.getKeyId() + ":" + properties.getKeySecret()).getBytes(StandardCharsets.UTF_8));
        this.restClient = RestClient.builder()
                .baseUrl(properties.getApiBaseUrl())
                .defaultHeader("Authorization", "Basic " + basic)
                .build();
    }

    @Override
    public RazorpayOrderCreateResult createOrder(BigDecimal amountInr, String receipt, String notesOrderId) {
        long paise = toPaise(amountInr);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", paise);
        body.put("currency", "INR");
        body.put("receipt", receipt);
        body.put("notes", Map.of("orderId", notesOrderId));
        JsonNode node = post("/orders", body);
        String id = node.path("id").asText(null);
        if (id == null || id.isBlank()) {
            throw new ExternalServiceException("Razorpay create order returned no id.");
        }
        return new RazorpayOrderCreateResult(id, amountInr.setScale(2, RoundingMode.HALF_UP), "INR");
    }

    @Override
    public RazorpayRefundResult createRefund(String razorpayPaymentId, BigDecimal amountInr, String reason) {
        long paise = toPaise(amountInr);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", paise);
        body.put("notes", Map.of("reason", reason == null ? "" : reason));
        JsonNode node = post("/payments/" + razorpayPaymentId + "/refund", body);
        String id = node.path("id").asText(null);
        if (id == null || id.isBlank()) {
            throw new ExternalServiceException("Razorpay create refund returned no id.");
        }
        return new RazorpayRefundResult(id);
    }

    private JsonNode post(String path, Object body) {
        try {
            String json = restClient.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readTree(json == null ? "{}" : json);
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            log.error("Razorpay HTTP {} on {}", status, path);
            if (status >= 500) {
                throw new ExternalServiceException("Razorpay unavailable (5xx).");
            }
            if (status == 408 || status == 429) {
                throw new ExternalServiceException("Razorpay timeout/unavailable.");
            }
            throw new ExternalServiceException("Razorpay request rejected.");
        } catch (ExternalServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Razorpay call failed on {}", path, ex);
            throw new ExternalServiceException("Razorpay unavailable (timeout).");
        }
    }

    private static long toPaise(BigDecimal amountInr) {
        return amountInr.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }
}
