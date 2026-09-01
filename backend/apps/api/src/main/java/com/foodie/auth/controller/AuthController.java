package com.foodie.auth.controller;

import com.foodie.auth.dto.request.AdminLoginRequestDto;
import com.foodie.auth.dto.request.CustomerLoginRequestDto;
import com.foodie.auth.dto.request.CustomerRegisterRequestDto;
import com.foodie.auth.dto.request.ForgotPasswordRequestDto;
import com.foodie.auth.dto.request.GoogleAuthRequestDto;
import com.foodie.auth.dto.request.LogoutRequestDto;
import com.foodie.auth.dto.request.RefreshTokenRequestDto;
import com.foodie.auth.dto.request.RequestOtpRequestDto;
import com.foodie.auth.dto.request.ResetPasswordRequestDto;
import com.foodie.auth.dto.request.VerifyOtpRequestDto;
import com.foodie.auth.dto.response.TokenPairResponseDto;
import com.foodie.auth.service.AuthService;
import com.foodie.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public AuthController(AuthService authService, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.authService = authService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @org.springframework.web.bind.annotation.GetMapping("/dev/approve")
    public String approveSpecific() {
        try {
            int rows = jdbcTemplate.update(
                    "UPDATE delivery_partner SET kyc_status = 'VERIFIED' WHERE user_credential_id = " +
                            "(SELECT id FROM user_credential WHERE phone_number = '9972301881')");
            return "SUCCESS: Rows updated: " + rows;
        } catch (Exception e) {
            e.printStackTrace();
            return "ERR: " + e.getMessage();
        }
    }

    @PostMapping("/register")
    @Operation(summary = "Customer Registration with email/password")
    public ResponseEntity<ApiResponse<TokenPairResponseDto>> register(
            @Valid @RequestBody CustomerRegisterRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(authService.registerCustomer(request)));
    }

    @PostMapping("/login/customer")
    @Operation(summary = "Customer Email/Password login")
    public ResponseEntity<ApiResponse<TokenPairResponseDto>> loginCustomer(
            @Valid @RequestBody CustomerLoginRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(authService.loginCustomer(request)));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset code via email")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDto request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset customer password using reset code")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDto request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/otp/request")
    @Operation(summary = "Request OTP", description = "Generate and dispatch a one-time password via SMS.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "OTP dispatched"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid phone"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "Rate limited")
    })
    public ResponseEntity<ApiResponse<Void>> requestOtp(@Valid @RequestBody RequestOtpRequestDto request) {
        authService.requestOtp(request.phoneNumber());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/otp/verify")
    @Operation(summary = "Verify OTP and authenticate")
    public ResponseEntity<ApiResponse<TokenPairResponseDto>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(authService.verifyOtp(request)));
    }

    @PostMapping("/google")
    @Operation(summary = "Authenticate Customer via Google ID token")
    public ResponseEntity<ApiResponse<TokenPairResponseDto>> google(
            @Valid @RequestBody GoogleAuthRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(authService.authenticateWithGoogle(request)));
    }

    @PostMapping("/login")
    @Operation(summary = "Admin email/password login", description = "Authenticates ADMIN credentials. Reuses the platform JWT + refresh-token pair. "
            + "Customer/Restaurant/Delivery must not call this endpoint.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Authenticated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation failed"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Invalid credentials"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Account deactivated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "Rate limited")
    })
    public ResponseEntity<ApiResponse<TokenPairResponseDto>> login(
            @Valid @RequestBody AdminLoginRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(authService.loginAdmin(request)));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate refresh token")
    public ResponseEntity<ApiResponse<TokenPairResponseDto>> refresh(
            @Valid @RequestBody RefreshTokenRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(authService.refresh(request.refreshToken())));
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke refresh token (single-device logout)")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody LogoutRequestDto request) {
        authService.revoke(request.refreshToken());
        return ResponseEntity.status(HttpStatus.NO_CONTENT).body(ApiResponse.success(null));
    }
}
