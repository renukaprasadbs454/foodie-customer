package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Narrow Review read for Restaurant avg_rating recalculation (Phase3 §2.11).
 * Restaurant must not access Review repositories directly.
 */
public interface ReviewRatingQuery {

    BigDecimal averageRestaurantRating(UUID restaurantId);
}
