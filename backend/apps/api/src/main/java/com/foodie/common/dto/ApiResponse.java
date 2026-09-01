package com.foodie.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.foodie.common.exception.ErrorCode;
import java.util.Map;
import org.slf4j.MDC;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record ApiResponse<T>(
        boolean success,
        T data,
        ErrorBody error,
        MetaInfo meta
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null, MetaInfo.of(currentRequestId()));
    }

    public static <T> ApiResponse<T> success(T data, PaginationMeta pagination) {
        return new ApiResponse<>(true, data, null, MetaInfo.of(currentRequestId(), pagination));
    }

    public static <T> ApiResponse<T> failure(ErrorCode code, String message) {
        return new ApiResponse<>(false, null, new ErrorBody(code.name(), message, null), MetaInfo.of(currentRequestId()));
    }

    /** Failure that still carries a data payload (e.g. CART_RESTAURANT_CONFLICT suggestedAction). */
    public static <T> ApiResponse<T> failure(ErrorCode code, String message, T data) {
        return new ApiResponse<>(false, data, new ErrorBody(code.name(), message, null), MetaInfo.of(currentRequestId()));
    }

    public static <T> ApiResponse<T> validationFailure(Map<String, String> fields) {
        return new ApiResponse<>(
                false,
                null,
                new ErrorBody(ErrorCode.VALIDATION_FAILED.name(), "One or more fields are invalid.", fields),
                MetaInfo.of(currentRequestId())
        );
    }

    private static String currentRequestId() {
        String id = MDC.get("requestId");
        return id == null ? java.util.UUID.randomUUID().toString() : id;
    }

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record ErrorBody(String code, String message, Map<String, String> fields) {
    }
}
