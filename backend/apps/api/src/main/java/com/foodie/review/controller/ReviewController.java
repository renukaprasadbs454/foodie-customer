package com.foodie.review.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.review.dto.request.SubmitReviewRequestDto;
import com.foodie.review.dto.response.RestaurantReviewItemDto;
import com.foodie.review.dto.response.ReviewResponseDto;
import com.foodie.review.service.ReviewService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Review")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/orders/{id}/review")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Submit review for a delivered order (one per order)")
    public ResponseEntity<ApiResponse<ReviewResponseDto>> submit(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID orderId,
            @Valid @RequestBody SubmitReviewRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(reviewService.submit(principal.userId(), orderId, request)));
    }

    @GetMapping("/restaurants/{id}/reviews")
    @Operation(summary = "List public reviews for a restaurant")
    public ResponseEntity<ApiResponse<List<RestaurantReviewItemDto>>> listForRestaurant(
            @PathVariable("id") UUID restaurantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        var result = reviewService.listForRestaurant(restaurantId, page, size, sort);
        return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
    }
}
