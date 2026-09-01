package com.foodie.restaurant.listener;

import com.foodie.shared.contract.RestaurantRatingAggregatePort;
import com.foodie.shared.contract.ReviewRatingQuery;
import com.foodie.shared.event.ReviewSubmittedEvent;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Restaurant owns avg_rating writes. Uses ReviewRatingQuery (shared contract) — never Review repos.
 */
@Component
public class ReviewSubmittedRatingListener {

    private static final Logger log = LoggerFactory.getLogger(ReviewSubmittedRatingListener.class);

    private final ReviewRatingQuery reviewRatingQuery;
    private final RestaurantRatingAggregatePort restaurantRatingAggregatePort;

    public ReviewSubmittedRatingListener(
            ReviewRatingQuery reviewRatingQuery,
            RestaurantRatingAggregatePort restaurantRatingAggregatePort
    ) {
        this.reviewRatingQuery = reviewRatingQuery;
        this.restaurantRatingAggregatePort = restaurantRatingAggregatePort;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReviewSubmitted(ReviewSubmittedEvent event) {
        try {
            BigDecimal avg = reviewRatingQuery.averageRestaurantRating(event.restaurantId());
            restaurantRatingAggregatePort.recalculateAvgRating(event.restaurantId(), avg);
            log.info("Updated restaurant {} avg_rating={}", event.restaurantId(), avg);
        } catch (RuntimeException ex) {
            log.error("Failed to recalculate avg_rating for restaurant {}: {}",
                    event.restaurantId(), ex.getMessage(), ex);
        }
    }
}
