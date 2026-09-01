package com.foodie.admin.controller;

import com.foodie.admin.dto.response.AuditLogResponseDto;
import com.foodie.admin.service.AdminOperationsService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@Tag(name = "Admin — Audit")
public class AdminAuditController {

    private final AdminOperationsService adminOperationsService;

    public AdminAuditController(AdminOperationsService adminOperationsService) {
        this.adminOperationsService = adminOperationsService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'SUPER_ADMIN')")
    @Operation(summary = "View audit log (SUPER_ADMIN only; not itself audited)")
    public ResponseEntity<ApiResponse<List<AuditLogResponseDto>>> list(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) UUID resourceId,
            @RequestParam(required = false) UUID adminUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            Instant createdAtFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            Instant createdAtTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        var result = adminOperationsService.listAuditLogs(
                principal.userId(),
                resourceType,
                resourceId,
                adminUserId,
                createdAtFrom,
                createdAtTo,
                page,
                size,
                sort
        );
        return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
    }
}
