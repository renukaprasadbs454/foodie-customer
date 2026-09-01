package com.foodie.admin.dto.response;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponseDto(
        UUID auditLogId,
        UUID adminUserId,
        String action,
        String resourceType,
        UUID resourceId,
        Object beforeState,
        Object afterState,
        Instant createdAt
) {
}
