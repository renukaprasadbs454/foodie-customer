package com.foodie.review.service.impl;

import com.foodie.review.repository.ReviewRepository;
import com.foodie.shared.contract.ReviewRatingQuery;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewRatingQueryImpl implements ReviewRatingQuery {

    private final ReviewRepository reviewRepository;

    public ReviewRatingQueryImpl(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal averageRestaurantRating(UUID restaurantId) {
        Double avg = reviewRepository.averageRestaurantRating(restaurantId);
        return BigDecimal.valueOf(avg == null ? 0.0 : avg).setScale(1, RoundingMode.HALF_UP);
    }
}
