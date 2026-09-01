package com.foodie.admin.controller;

import com.foodie.admin.dto.request.CreateAdminUserRequestDto;
import com.foodie.admin.dto.response.AdminUserResponseDto;
import com.foodie.admin.service.AdminService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@Tag(name = "Admin — Users")
public class AdminUserController {

    private final AdminService adminService;

    public AdminUserController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Current admin profile + sub-role")
    public ResponseEntity<ApiResponse<AdminUserResponseDto>> me(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                adminService.toResponse(adminService.requireAdminProfile(principal.userId()))));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'SUPER_ADMIN')")
    @Operation(summary = "Provision an admin user (SUPER_ADMIN); login via existing OTP on phone")
    public ResponseEntity<ApiResponse<AdminUserResponseDto>> create(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CreateAdminUserRequestDto request
    ) {
        var view = adminService.createAdminUser(
                new AdminService.CreateAdminUserCommand(
                        request.fullName(),
                        request.phoneNumber(),
                        request.email(),
                        request.role()
                ),
                new AdminService.ActorContext(principal.userId())
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(adminService.toResponse(view)));
    }
}
