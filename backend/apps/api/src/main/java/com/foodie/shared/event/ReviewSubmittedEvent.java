package com.foodie.shared.event;

import java.time.Instant;
import java.util.UUID;

public record ReviewSubmittedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID reviewId,
        UUID orderId,
        UUID restaurantId,
        UUID customerId,
        UUID deliveryPartnerId,
        int restaurantRating,
        Integer deliveryRating
) implements DomainEvent {

    public static ReviewSubmittedEvent of(
            UUID reviewId,
            UUID orderId,
            UUID restaurantId,
            UUID customerId,
            UUID deliveryPartnerId,
            int restaurantRating,
            Integer deliveryRating
    ) {
        return new ReviewSubmittedEvent(
                UUID.randomUUID(),
                Instant.now(),
                reviewId,
                orderId,
                restaurantId,
                customerId,
                deliveryPartnerId,
                restaurantRating,
                deliveryRating
        );
    }
}
