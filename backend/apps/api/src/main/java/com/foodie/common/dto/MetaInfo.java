package com.foodie.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record MetaInfo(
        Instant timestamp,
        String requestId,
        PaginationMeta pagination
) {
    public static MetaInfo of(String requestId) {
        return new MetaInfo(Instant.now(), requestId, null);
    }

    public static MetaInfo of(String requestId, PaginationMeta pagination) {
        return new MetaInfo(Instant.now(), requestId, pagination);
    }
}
