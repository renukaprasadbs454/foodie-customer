package com.foodie.order.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.order.service.IdempotencyService;
import java.time.Duration;
import java.util.Optional;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Redis idempotency:{key} ~24h (Phase3 §4.9 / §6).
 */
@Service
public class IdempotencyServiceImpl implements IdempotencyService {

    private static final Duration TTL = Duration.ofHours(24);
    private static final String PREFIX = "idempotency:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public IdempotencyServiceImpl(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<OrderResponseDto> findCachedResponse(String key, String payloadHash) {
        String raw = redisTemplate.opsForValue().get(PREFIX + key);
        if (raw == null) {
            return Optional.empty();
        }
        try {
            JsonNode node = objectMapper.readTree(raw);
            String storedHash = node.path("payloadHash").asText(null);
            if (storedHash == null || !storedHash.equals(payloadHash)) {
                throw new ConflictException(
                        ErrorCode.IDEMPOTENCY_KEY_REUSED,
                        "Idempotency key was already used with a different payload."
                );
            }
            OrderResponseDto response = objectMapper.treeToValue(node.get("response"), OrderResponseDto.class);
            return Optional.ofNullable(response);
        } catch (JsonProcessingException ex) {
            redisTemplate.delete(PREFIX + key);
            return Optional.empty();
        }
    }

    @Override
    public void store(String key, String payloadHash, OrderResponseDto response) {
        try {
            String json = objectMapper.writeValueAsString(new Stored(payloadHash, response));
            redisTemplate.opsForValue().set(PREFIX + key, json, TTL);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize idempotent order response.", ex);
        }
    }

    private record Stored(String payloadHash, OrderResponseDto response) {
    }
}
