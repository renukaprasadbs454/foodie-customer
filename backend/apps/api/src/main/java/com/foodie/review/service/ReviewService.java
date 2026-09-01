package com.foodie.review.service;

import com.foodie.common.dto.PaginationMeta;
import com.foodie.review.dto.request.SubmitReviewRequestDto;
import com.foodie.review.dto.response.RestaurantReviewItemDto;
import com.foodie.review.dto.response.ReviewResponseDto;
import java.util.List;
import java.util.UUID;

public interface ReviewService {

    ReviewResponseDto submit(UUID userCredentialId, UUID orderId, SubmitReviewRequestDto request);

    PageResult<RestaurantReviewItemDto> listForRestaurant(
            UUID restaurantId, int page, int size, String sort);

    /** Moderation flag (Redis). Intended for Admin module; no public REST in Module 11 contracts. */
    void flagForModeration(UUID reviewId, String reason);

    void clearModerationFlag(UUID reviewId);

    record PageResult<T>(List<T> items, PaginationMeta pagination) {
    }
}
