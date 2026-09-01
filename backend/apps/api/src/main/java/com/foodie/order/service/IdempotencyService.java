package com.foodie.order.service;

import com.foodie.order.dto.response.OrderResponseDto;
import java.util.Optional;

/**
 * Service for caching and checking idempotency of order creation requests.
 */
public interface IdempotencyService {

    Optional<OrderResponseDto> findCachedResponse(String key, String payloadHash);

    void store(String key, String payloadHash, OrderResponseDto response);
}
