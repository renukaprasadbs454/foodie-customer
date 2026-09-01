package com.foodie.restaurant;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.restaurant.listener.ReviewSubmittedRatingListener;
import com.foodie.shared.contract.RestaurantRatingAggregatePort;
import com.foodie.shared.contract.ReviewRatingQuery;
import com.foodie.shared.event.ReviewSubmittedEvent;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ReviewSubmittedRatingListenerTest {

    @Mock private ReviewRatingQuery reviewRatingQuery;
    @Mock private RestaurantRatingAggregatePort restaurantRatingAggregatePort;

    private ReviewSubmittedRatingListener listener;

    @BeforeEach
    void setUp() {
        listener = new ReviewSubmittedRatingListener(reviewRatingQuery, restaurantRatingAggregatePort);
    }

    @Test
    void onReviewSubmitted_recalculatesRestaurantAvg() {
        UUID restaurantId = UUID.randomUUID();
        when(reviewRatingQuery.averageRestaurantRating(restaurantId))
                .thenReturn(new BigDecimal("4.5"));

        listener.onReviewSubmitted(ReviewSubmittedEvent.of(
                UUID.randomUUID(),
                UUID.randomUUID(),
                restaurantId,
                UUID.randomUUID(),
                UUID.randomUUID(),
                5,
                4
        ));

        verify(restaurantRatingAggregatePort).recalculateAvgRating(
                eq(restaurantId), eq(new BigDecimal("4.5")));
    }
}
