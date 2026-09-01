package com.foodie.notification.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.notification.dto.request.RegisterDeviceTokenRequestDto;
import com.foodie.notification.dto.request.UpdateNotificationPreferenceRequestDto;
import com.foodie.notification.dto.response.NotificationPreferenceResponseDto;
import com.foodie.notification.dto.response.NotificationReadResponseDto;
import com.foodie.notification.dto.response.NotificationResponseDto;
import com.foodie.notification.service.NotificationService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notification")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List my notifications")
    public ResponseEntity<ApiResponse<List<NotificationResponseDto>>> list(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var result = notificationService.list(principal.userId(), unreadOnly, page, size);
        return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark notification as read (own only)")
    public ResponseEntity<ApiResponse<NotificationReadResponseDto>> markRead(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.markRead(principal.userId(), id)));
    }

    @GetMapping("/preferences")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get notification channel preferences (Redis-backed; default all enabled)")
    public ResponseEntity<ApiResponse<NotificationPreferenceResponseDto>> getPreferences(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getPreferences(principal.userId())));
    }

    @PutMapping("/preferences")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update notification channel preferences")
    public ResponseEntity<ApiResponse<NotificationPreferenceResponseDto>> updatePreferences(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpdateNotificationPreferenceRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.updatePreferences(principal.userId(), request)));
    }

    @PutMapping("/device-token")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Register FCM device token for push delivery")
    public ResponseEntity<ApiResponse<Void>> registerDeviceToken(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody RegisterDeviceTokenRequestDto request
    ) {
        notificationService.registerDeviceToken(principal.userId(), request.deviceToken());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
