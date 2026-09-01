package com.foodie.user.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.security.principal.AuthPrincipal;
import com.foodie.user.dto.request.AddAddressRequestDto;
import com.foodie.user.dto.request.ChangePasswordRequestDto;
import com.foodie.user.dto.request.UpdateAddressRequestDto;
import com.foodie.user.dto.request.UpdateProfileRequestDto;
import com.foodie.user.dto.response.AddressResponseDto;
import com.foodie.user.dto.response.CustomerProfileResponseDto;
import com.foodie.user.dto.response.FileUploadResponseDto;
import com.foodie.user.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User")
@PreAuthorize("hasRole('CUSTOMER')")
public class UserController {

    private final CustomerService customerService;

    public UserController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping("/me")
    @Operation(summary = "Get my customer profile")
    public ResponseEntity<ApiResponse<CustomerProfileResponseDto>> getMe(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getMyProfile(principal.userId())));
    }

    @PutMapping("/me")
    @Operation(summary = "Update my customer profile (full replace)")
    public ResponseEntity<ApiResponse<CustomerProfileResponseDto>> updateMe(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpdateProfileRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(customerService.updateMyProfile(principal.userId(), request)));
    }

    @PostMapping("/me/change-password")
    @Operation(summary = "Change password for logged in customer")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ChangePasswordRequestDto request
    ) {
        customerService.changePassword(principal.userId(), request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/me/addresses")
    @Operation(summary = "Add a delivery address")
    public ResponseEntity<ApiResponse<AddressResponseDto>> addAddress(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody AddAddressRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(customerService.addAddress(principal.userId(), request)));
    }

    @PutMapping("/me/addresses/{addressId}")
    @Operation(summary = "Update a delivery address")
    public ResponseEntity<ApiResponse<AddressResponseDto>> updateAddress(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID addressId,
            @Valid @RequestBody UpdateAddressRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success(customerService.updateAddress(principal.userId(), addressId, request)));
    }

    @PutMapping("/me/addresses/{addressId}/default")
    @Operation(summary = "Set default delivery address")
    public ResponseEntity<ApiResponse<AddressResponseDto>> setDefaultAddress(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID addressId
    ) {
        return ResponseEntity.ok(ApiResponse.success(customerService.setDefaultAddress(principal.userId(), addressId)));
    }

    @GetMapping("/me/addresses")
    @Operation(summary = "List my delivery addresses")
    public ResponseEntity<ApiResponse<List<AddressResponseDto>>> listAddresses(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(customerService.listAddresses(principal.userId())));
    }

    @DeleteMapping("/me/addresses/{addressId}")
    @Operation(summary = "Soft-delete a delivery address")
    public ResponseEntity<ApiResponse<Void>> removeAddress(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID addressId
    ) {
        customerService.removeAddress(principal.userId(), addressId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).body(ApiResponse.success(null));
    }

    @PostMapping(value = "/me/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload customer profile image")
    public ResponseEntity<ApiResponse<FileUploadResponseDto>> uploadProfileImage(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(customerService.uploadProfileImage(principal.userId(), file)));
    }
}
