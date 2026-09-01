package com.foodie.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.common.enums.OrderStatus;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.review.dto.request.SubmitReviewRequestDto;
import com.foodie.review.dto.response.ReviewResponseDto;
import com.foodie.review.entity.Review;
import com.foodie.review.repository.ReviewRepository;
import com.foodie.review.service.ReviewModerationStore;
import com.foodie.review.service.impl.ReviewServiceImpl;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.OrderReviewQuery;
import com.foodie.shared.event.ReviewSubmittedEvent;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ReviewServiceImplTest {

    @Mock private ReviewRepository reviewRepository;
    @Mock private OrderReviewQuery orderReviewQuery;
    @Mock private CustomerSummaryProvider customerSummaryProvider;
    @Mock private ReviewModerationStore moderationStore;
    @Mock private ApplicationEventPublisher eventPublisher;

    private ReviewServiceImpl service;

    private final UUID credentialId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();
    private final UUID restaurantId = UUID.randomUUID();
    private final UUID partnerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new ReviewServiceImpl(
                reviewRepository,
                orderReviewQuery,
                customerSummaryProvider,
                moderationStore,
                eventPublisher
        );
    }

    @Test
    void submit_deliveredOrder_createsReviewAndPublishesEvent() {
        when(customerSummaryProvider.findByUserCredentialId(credentialId))
                .thenReturn(Optional.of(new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
        when(orderReviewQuery.findByOrderId(orderId)).thenReturn(Optional.of(
                new OrderReviewQuery.OrderReviewSnapshot(
                        orderId, customerId, restaurantId, partnerId, OrderStatus.DELIVERED)));
        when(reviewRepository.existsByOrderId(orderId)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> {
            Review r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", UUID.randomUUID());
            return r;
        });

        ReviewResponseDto result = service.submit(
                credentialId, orderId, new SubmitReviewRequestDto(5, 4, "Great"));

        assertThat(result.restaurantRating()).isEqualTo(5);
        assertThat(result.deliveryRating()).isEqualTo(4);
        assertThat(result.comment()).isEqualTo("Great");
        verify(eventPublisher).publishEvent(any(ReviewSubmittedEvent.class));
    }

    @Test
    void submit_notDelivered_throws422() {
        when(customerSummaryProvider.findByUserCredentialId(credentialId))
                .thenReturn(Optional.of(new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
        when(orderReviewQuery.findByOrderId(orderId)).thenReturn(Optional.of(
                new OrderReviewQuery.OrderReviewSnapshot(
                        orderId, customerId, restaurantId, partnerId, OrderStatus.OUT_FOR_DELIVERY)));

        assertThatThrownBy(() -> service.submit(
                credentialId, orderId, new SubmitReviewRequestDto(5, null, null)))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_NOT_DELIVERED);
        verify(reviewRepository, never()).save(any());
    }

    @Test
    void submit_alreadyExists_throws409() {
        when(customerSummaryProvider.findByUserCredentialId(credentialId))
                .thenReturn(Optional.of(new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
        when(orderReviewQuery.findByOrderId(orderId)).thenReturn(Optional.of(
                new OrderReviewQuery.OrderReviewSnapshot(
                        orderId, customerId, restaurantId, null, OrderStatus.DELIVERED)));
        when(reviewRepository.existsByOrderId(orderId)).thenReturn(true);

        assertThatThrownBy(() -> service.submit(
                credentialId, orderId, new SubmitReviewRequestDto(4, 3, "ok")))
                .isInstanceOf(ConflictException.class)
                .extracting(ex -> ((ConflictException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REVIEW_ALREADY_EXISTS);
    }

    @Test
    void submit_otherCustomersOrder_throws404() {
        when(customerSummaryProvider.findByUserCredentialId(credentialId))
                .thenReturn(Optional.of(new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
        when(orderReviewQuery.findByOrderId(orderId)).thenReturn(Optional.of(
                new OrderReviewQuery.OrderReviewSnapshot(
                        orderId, UUID.randomUUID(), restaurantId, null, OrderStatus.DELIVERED)));

        assertThatThrownBy(() -> service.submit(
                credentialId, orderId, new SubmitReviewRequestDto(5, null, null)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void listForRestaurant_hidesFlaggedAndOmitsCustomer() {
        Review visible = Review.submit(orderId, customerId, restaurantId, partnerId, 5, 4, "Nice");
        ReflectionTestUtils.setField(visible, "id", UUID.randomUUID());
        Review flagged = Review.submit(UUID.randomUUID(), customerId, restaurantId, null, 1, null, "Bad");
        UUID flaggedId = UUID.randomUUID();
        ReflectionTestUtils.setField(flagged, "id", flaggedId);

        when(reviewRepository.findByRestaurantId(org.mockito.ArgumentMatchers.eq(restaurantId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(visible, flagged)));
        when(moderationStore.isFlagged(visible.getId())).thenReturn(false);
        when(moderationStore.isFlagged(flaggedId)).thenReturn(true);

        var page = service.listForRestaurant(restaurantId, 0, 20, "createdAt");

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().getFirst().comment()).isEqualTo("Nice");
        // Public DTO has no customer fields — structural guarantee via record shape
        assertThat(page.items().getFirst().getClass().getRecordComponents())
                .extracting(c -> c.getName())
                .doesNotContain("customerId", "customerName");
    }

    @Test
    void listForRestaurant_invalidSort_throws400() {
        assertThatThrownBy(() -> service.listForRestaurant(restaurantId, 0, 20, "comment"))
                .extracting(ex -> ((com.foodie.common.exception.BadRequestException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_SORT_FIELD);
    }

    @Test
    void flagForModeration_missingReview_throws404() {
        UUID reviewId = UUID.randomUUID();
        when(reviewRepository.existsById(reviewId)).thenReturn(false);

        assertThatThrownBy(() -> service.flagForModeration(reviewId, "spam"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(moderationStore, never()).flag(any(), any());
    }

    @Test
    void submit_publishesEventWithRatings() {
        when(customerSummaryProvider.findByUserCredentialId(credentialId))
                .thenReturn(Optional.of(new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
        when(orderReviewQuery.findByOrderId(orderId)).thenReturn(Optional.of(
                new OrderReviewQuery.OrderReviewSnapshot(
                        orderId, customerId, restaurantId, partnerId, OrderStatus.DELIVERED)));
        when(reviewRepository.existsByOrderId(orderId)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> {
            Review r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", UUID.randomUUID());
            return r;
        });

        service.submit(credentialId, orderId, new SubmitReviewRequestDto(5, 2, null));

        ArgumentCaptor<ReviewSubmittedEvent> captor = ArgumentCaptor.forClass(ReviewSubmittedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().restaurantRating()).isEqualTo(5);
        assertThat(captor.getValue().deliveryRating()).isEqualTo(2);
        assertThat(captor.getValue().restaurantId()).isEqualTo(restaurantId);
    }
}
