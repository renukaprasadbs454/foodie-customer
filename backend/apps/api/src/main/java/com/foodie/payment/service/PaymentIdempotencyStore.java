package com.foodie.payment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.payment.dto.response.PaymentInitiationResponseDto;
import java.time.Duration;
import java.util.Optional;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class PaymentIdempotencyStore {

    private static final Duration TTL = Duration.ofHours(24);
    private static final String PREFIX = "idempotency:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public PaymentIdempotencyStore(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<PaymentInitiationResponseDto> find(String key) {
        String raw = redisTemplate.opsForValue().get(PREFIX + key);
        if (raw == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(raw, PaymentInitiationResponseDto.class));
        } catch (JsonProcessingException ex) {
            redisTemplate.delete(PREFIX + key);
            return Optional.empty();
        }
    }

    public void store(String key, PaymentInitiationResponseDto response) {
        try {
            redisTemplate.opsForValue().set(PREFIX + key, objectMapper.writeValueAsString(response), TTL);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to cache payment initiation response.", ex);
        }
    }
}
