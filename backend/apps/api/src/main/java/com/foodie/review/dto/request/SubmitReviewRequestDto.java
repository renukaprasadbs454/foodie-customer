package com.foodie.review.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SubmitReviewRequestDto(
        @NotNull @Min(1) @Max(5) Integer restaurantRating,
        @Min(1) @Max(5) Integer deliveryRating,
        @Size(max = 1000) String comment
) {
}
