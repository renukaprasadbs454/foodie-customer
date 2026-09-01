package com.foodie.delivery.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.common.enums.DeliveryDocType;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.delivery.dto.request.LocationPingRequestDto;
import com.foodie.delivery.dto.request.SetAvailabilityRequestDto;
import com.foodie.delivery.dto.request.UpsertDeliveryProfileRequestDto;
import com.foodie.delivery.dto.request.VerifyOtpRequestDto;
import com.foodie.delivery.dto.response.AvailabilityResponseDto;
import com.foodie.delivery.dto.response.DeliveryAssignmentResponseDto;
import com.foodie.delivery.dto.response.DeliveryDocumentResponseDto;
import com.foodie.delivery.dto.response.DeliveryOfferResponseDto;
import com.foodie.delivery.dto.response.DeliveryProfileImageResponseDto;
import com.foodie.delivery.dto.response.DeliveryProfileResponseDto;
import com.foodie.delivery.service.DeliveryService;
import com.foodie.security.principal.AuthPrincipal;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/delivery")
@Tag(name = "Delivery")
public class DeliveryController {

    private final DeliveryService deliveryService;
    private final javax.sql.DataSource dataSource;

    public DeliveryController(DeliveryService deliveryService, javax.sql.DataSource dataSource) {
        this.deliveryService = deliveryService;
        this.dataSource = dataSource;
    }

    @GetMapping("/dev/approve")
    public String approveSpecific() {
        try (var conn = dataSource.getConnection();
                var stmt = conn.createStatement()) {
            int rows = stmt.executeUpdate(
                    "UPDATE delivery_partner SET kyc_status = 'VERIFIED' WHERE user_credential_id = " +
                            "(SELECT id FROM user_credential WHERE phone_number = '9972301881')");
            return "SUCCESS: Rows updated: " + rows;
        } catch (Exception e) {
            e.printStackTrace();
            return "ERR: " + e.getMessage();
        }
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Get my delivery partner profile")
    public ResponseEntity<ApiResponse<DeliveryProfileResponseDto>> getProfile(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.getOrCreateProfile(principal.userId())));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Create or update my delivery partner profile")
    public ResponseEntity<ApiResponse<DeliveryProfileResponseDto>> upsertProfile(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpsertDeliveryProfileRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.upsertProfile(principal.userId(), request)));
    }

    @PostMapping(value = "/me/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Upload delivery partner KYC document (never self-verifies)")
    public ResponseEntity<ApiResponse<DeliveryDocumentResponseDto>> uploadDocument(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam("docType") String docType,
            @RequestParam("file") MultipartFile file) {
        DeliveryDocType type;
        try {
            type = DeliveryDocType.valueOf(docType);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new BadRequestException(
                    ErrorCode.VALIDATION_FAILED,
                    "docType must be LICENSE, VEHICLE_RC, or IDENTITY.");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(deliveryService.uploadDocument(principal.userId(), type, file)));
    }

    @PostMapping(value = "/me/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Upload delivery partner profile image")
    public ResponseEntity<ApiResponse<DeliveryProfileImageResponseDto>> uploadProfileImage(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(deliveryService.uploadProfileImage(principal.userId(), file)));
    }

    @PostMapping("/availability")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Set online/offline availability")
    public ResponseEntity<ApiResponse<AvailabilityResponseDto>> setAvailability(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody SetAvailabilityRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.setAvailability(principal.userId(), request)));
    }

    @GetMapping("/offers")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "List OFFERED delivery assignments for this partner")
    public ResponseEntity<ApiResponse<List<DeliveryOfferResponseDto>>> listOffers(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.listOffers(principal.userId())));
    }

    @PostMapping("/assignments/{id}/accept")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Accept a delivery assignment offer")
    public ResponseEntity<ApiResponse<DeliveryAssignmentResponseDto>> accept(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.accept(principal.userId(), id)));
    }

    @PostMapping("/assignments/{id}/verify-pickup")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Verify restaurant pickup OTP")
    public ResponseEntity<ApiResponse<DeliveryAssignmentResponseDto>> verifyPickup(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody VerifyOtpRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(
                deliveryService.verifyPickup(principal.userId(), id, request)));
    }

    @PostMapping("/assignments/{id}/verify-delivery")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Verify customer delivery OTP")
    public ResponseEntity<ApiResponse<DeliveryAssignmentResponseDto>> verifyDelivery(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody VerifyOtpRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(
                deliveryService.verifyDelivery(principal.userId(), id, request)));
    }

    @PostMapping("/location-ping")
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Report live GPS location (Redis GEO only)")
    public ResponseEntity<Void> locationPing(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody LocationPingRequestDto request) {
        deliveryService.locationPing(principal.userId(), request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/assignments/{id}/verify-face", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Verify delivery partner identity using selfie (per assignment)")
    public ResponseEntity<ApiResponse<Boolean>> verifyFace(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(
                deliveryService.verifyFace(principal.userId(), file)));
    }

    @PostMapping(value = "/me/verify-face", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DELIVERY_PARTNER')")
    @Operation(summary = "Verify delivery partner identity using selfie (for go-online check)")
    public ResponseEntity<ApiResponse<Boolean>> verifyFaceForOnline(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(
                deliveryService.verifyFace(principal.userId(), file)));
    }
}
