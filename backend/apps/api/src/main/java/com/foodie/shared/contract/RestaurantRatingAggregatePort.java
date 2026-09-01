package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Sole legal way Review aggregation updates restaurant.avg_rating (Phase3 §2.11).
 * Review publishes ReviewSubmittedEvent; Restaurant implements this port.
 */
public interface RestaurantRatingAggregatePort {

    void recalculateAvgRating(UUID restaurantId, BigDecimal averageRestaurantRating);
}
