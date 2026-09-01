package com.foodie.review.service.impl;

import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.OrderStatus;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.review.dto.request.SubmitReviewRequestDto;
import com.foodie.review.dto.response.RestaurantReviewItemDto;
import com.foodie.review.dto.response.ReviewResponseDto;
import com.foodie.review.entity.Review;
import com.foodie.review.mapper.ReviewMapper;
import com.foodie.review.repository.ReviewRepository;
import com.foodie.review.service.ReviewModerationStore;
import com.foodie.review.service.ReviewService;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.OrderReviewQuery;
import com.foodie.shared.event.ReviewSubmittedEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderReviewQuery orderReviewQuery;
    private final CustomerSummaryProvider customerSummaryProvider;
    private final ReviewModerationStore moderationStore;
    private final ApplicationEventPublisher eventPublisher;

    public ReviewServiceImpl(
            ReviewRepository reviewRepository,
            OrderReviewQuery orderReviewQuery,
            CustomerSummaryProvider customerSummaryProvider,
            ReviewModerationStore moderationStore,
            ApplicationEventPublisher eventPublisher
    ) {
        this.reviewRepository = reviewRepository;
        this.orderReviewQuery = orderReviewQuery;
        this.customerSummaryProvider = customerSummaryProvider;
        this.moderationStore = moderationStore;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional
    public ReviewResponseDto submit(UUID userCredentialId, UUID orderId, SubmitReviewRequestDto request) {
        UUID customerId = customerSummaryProvider.findByUserCredentialId(userCredentialId)
                .map(CustomerSummaryProvider.CustomerSummary::customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));

        OrderReviewQuery.OrderReviewSnapshot order = orderReviewQuery.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        if (!customerId.equals(order.customerId())) {
            // Hide existence of others' orders
            throw new ResourceNotFoundException("Order not found.");
        }
        if (order.status() != OrderStatus.DELIVERED) {
            throw new UnprocessableEntityException(
                    ErrorCode.ORDER_NOT_DELIVERED,
                    "Reviews are allowed only for delivered orders."
            );
        }
        if (reviewRepository.existsByOrderId(orderId)) {
            throw new ConflictException(
                    ErrorCode.REVIEW_ALREADY_EXISTS,
                    "A review already exists for this order."
            );
        }

        Review review = Review.submit(
                order.orderId(),
                customerId,
                order.restaurantId(),
                order.deliveryPartnerId(),
                request.restaurantRating(),
                request.deliveryRating(),
                request.comment()
        );

        try {
            review = reviewRepository.save(review);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(
                    ErrorCode.REVIEW_ALREADY_EXISTS,
                    "A review already exists for this order."
            );
        }

        eventPublisher.publishEvent(ReviewSubmittedEvent.of(
                review.getId(),
                review.getOrderId(),
                review.getRestaurantId(),
                review.getCustomerId(),
                review.getDeliveryPartnerId(),
                review.getRestaurantRating(),
                review.getDeliveryRating() == null ? null : review.getDeliveryRating().intValue()
        ));

        return ReviewMapper.toResponse(review);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<RestaurantReviewItemDto> listForRestaurant(
            UUID restaurantId, int page, int size, String sort) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), resolveSort(sort));
        Page<Review> result = reviewRepository.findByRestaurantId(restaurantId, pageable);
        List<RestaurantReviewItemDto> items = result.getContent().stream()
                .filter(review -> !moderationStore.isFlagged(review.getId()))
                .map(ReviewMapper::toPublicItem)
                .toList();
        // Pagination meta reflects DB page; flagged rows may thin the page (acceptable V1 trade-off).
        return new PageResult<>(items, new PaginationMeta(
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        ));
    }

    @Override
    public void flagForModeration(UUID reviewId, String reason) {
        if (!reviewRepository.existsById(reviewId)) {
            throw new ResourceNotFoundException("Review not found.");
        }
        moderationStore.flag(reviewId, reason);
    }

    @Override
    public void clearModerationFlag(UUID reviewId) {
        moderationStore.clear(reviewId);
    }

    private static int clampSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, 100);
    }

    private static Sort resolveSort(String sort) {
        if (sort == null || sort.isBlank() || "createdAt".equals(sort) || "-createdAt".equals(sort)) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        if ("+createdAt".equals(sort)) {
            return Sort.by(Sort.Direction.ASC, "createdAt");
        }
        if ("restaurantRating".equals(sort) || "-restaurantRating".equals(sort)) {
            return Sort.by(Sort.Direction.DESC, "restaurantRating");
        }
        if ("+restaurantRating".equals(sort)) {
            return Sort.by(Sort.Direction.ASC, "restaurantRating");
        }
        throw new BadRequestException(
                ErrorCode.INVALID_SORT_FIELD, "Allowed sort fields: createdAt, restaurantRating.");
    }
}
