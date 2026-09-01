package com.foodie.admin.controller;

import com.foodie.admin.dto.request.FlagReviewRequestDto;
import com.foodie.admin.dto.response.ModerationResponseDto;
import com.foodie.admin.service.AdminOperationsService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Review moderation ops (Module 13 scope). Delegates to ReviewService Redis flags — no Review table writes.
 */
@RestController
@RequestMapping("/api/v1/admin/reviews")
@Tag(name = "Admin — Moderation")
public class AdminModerationController {

    private final AdminOperationsService adminOperationsService;

    public AdminModerationController(AdminOperationsService adminOperationsService) {
        this.adminOperationsService = adminOperationsService;
    }

    @PostMapping("/{id}/flag")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.can(authentication, 'REVIEW', 'MODERATE')")
    @Operation(summary = "Flag a review for moderation (hides from public list)")
    public ResponseEntity<ApiResponse<ModerationResponseDto>> flag(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID reviewId,
            @Valid @RequestBody FlagReviewRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                adminOperationsService.flagReview(principal.userId(), reviewId, request)));
    }

    @DeleteMapping("/{id}/flag")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.can(authentication, 'REVIEW', 'MODERATE')")
    @Operation(summary = "Clear a review moderation flag")
    public ResponseEntity<ApiResponse<ModerationResponseDto>> clearFlag(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable("id") UUID reviewId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                adminOperationsService.clearReviewFlag(principal.userId(), reviewId)));
    }
}
