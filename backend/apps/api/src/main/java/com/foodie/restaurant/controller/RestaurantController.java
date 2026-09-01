package com.foodie.restaurant.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.common.enums.RestaurantDocType;
import com.foodie.common.enums.RestaurantImageType;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.restaurant.dto.request.CreateRestaurantRequestDto;
import com.foodie.restaurant.dto.request.RestaurantLegalDetailRequestDto;
import com.foodie.restaurant.dto.request.RestaurantUpiRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantBankDetailsRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantLocationRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantRequestDto;
import com.foodie.restaurant.dto.request.VerifyUpiRequestDto;
import com.foodie.restaurant.dto.response.RestaurantBankDetailsResponseDto;
import com.foodie.restaurant.dto.response.RestaurantDashboardSummaryResponseDto;
import com.foodie.restaurant.dto.response.RestaurantDetailResponseDto;
import com.foodie.restaurant.dto.response.RestaurantDocumentResponseDto;
import com.foodie.restaurant.dto.response.RestaurantImageUploadResponseDto;
import com.foodie.restaurant.dto.response.RestaurantLegalDetailResponseDto;
import com.foodie.restaurant.dto.response.RestaurantLocationResponseDto;
import com.foodie.restaurant.dto.response.RestaurantSummaryResponseDto;
import com.foodie.restaurant.dto.response.RestaurantUpiResponseDto;
import com.foodie.restaurant.dto.response.VerificationResultResponseDto;
import com.foodie.restaurant.service.RestaurantService;
import com.foodie.security.principal.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/restaurants")
@Tag(name = "Restaurant")
public class RestaurantController {

    private final RestaurantService restaurantService;

    public RestaurantController(RestaurantService restaurantService) {
        this.restaurantService = restaurantService;
    }

    @GetMapping
    @Operation(summary = "List / search APPROVED restaurants (public)")
    public ResponseEntity<ApiResponse<List<RestaurantSummaryResponseDto>>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String cuisineType,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        var result = restaurantService.search(search, cuisineType, minRating, lat, lng, page, size, sort);
        return ResponseEntity.ok(ApiResponse.success(result.items(), result.pagination()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get restaurant detail (public APPROVED; owner/admin may see PENDING/SUSPENDED)")
    public ResponseEntity<ApiResponse<RestaurantDetailResponseDto>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal AuthPrincipal principal) {
        UUID callerId = principal == null ? null : principal.userId();
        boolean admin = principal != null && principal.userType() == UserType.ADMIN;
        return ResponseEntity.ok(ApiResponse.success(restaurantService.getById(id, callerId, admin)));
    }

    @PostMapping
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Register restaurant profile (status=PENDING)")
    public ResponseEntity<ApiResponse<RestaurantDetailResponseDto>> create(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CreateRestaurantRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(restaurantService.create(principal.userId(), request)));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Get my restaurant profile")
    public ResponseEntity<ApiResponse<RestaurantDetailResponseDto>> getMe(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.getMyRestaurant(principal.userId())));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Update my restaurant profile (status/commissionPct not updatable)")
    public ResponseEntity<ApiResponse<RestaurantDetailResponseDto>> updateMe(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpdateRestaurantRequestDto request) {
        return ResponseEntity
                .ok(ApiResponse.success(restaurantService.updateMyRestaurant(principal.userId(), request)));
    }

    @GetMapping("/me/location")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Get store map location and formatted address")
    public ResponseEntity<ApiResponse<RestaurantLocationResponseDto>> getLocation(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.getLocation(principal.userId())));
    }

    @PutMapping("/me/location")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Update store map location and formatted address")
    public ResponseEntity<ApiResponse<RestaurantLocationResponseDto>> updateLocation(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpdateRestaurantLocationRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.updateLocation(principal.userId(), request)));
    }

    @GetMapping("/me/bank-details")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Get restaurant bank account and UPI details")
    public ResponseEntity<ApiResponse<RestaurantBankDetailsResponseDto>> getBankDetails(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.getBankDetails(principal.userId())));
    }

    @PutMapping("/me/bank-details")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Update restaurant bank account and UPI details")
    public ResponseEntity<ApiResponse<RestaurantBankDetailsResponseDto>> updateBankDetails(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpdateRestaurantBankDetailsRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.updateBankDetails(principal.userId(), request)));
    }

    @PostMapping("/me/bank-details/verify")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Verify restaurant bank account")
    public ResponseEntity<ApiResponse<VerificationResultResponseDto>> verifyBankDetails(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.verifyBankDetails(principal.userId())));
    }

    @PostMapping("/me/upi/verify")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Verify restaurant UPI ID")
    public ResponseEntity<ApiResponse<VerificationResultResponseDto>> verifyUpi(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody VerifyUpiRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.verifyUpi(principal.userId(), request)));
    }

    @PostMapping(value = "/me/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Upload restaurant onboarding document (never self-verifies)")
    public ResponseEntity<ApiResponse<RestaurantDocumentResponseDto>> uploadDocument(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestPart("docType") String docType,
            @RequestPart("file") MultipartFile file) {
        RestaurantDocType type;
        try {
            type = RestaurantDocType.valueOf(docType);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "docType must be FSSAI, GST, or PAN.");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(restaurantService.uploadDocument(principal.userId(), type, file)));
    }

    @PostMapping(value = "/me/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Upload restaurant logo or cover image")
    public ResponseEntity<ApiResponse<RestaurantImageUploadResponseDto>> uploadImage(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestPart("imageType") String imageType,
            @RequestPart("file") MultipartFile file) {
        RestaurantImageType type;
        try {
            type = RestaurantImageType.valueOf(imageType);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "imageType must be LOGO or COVER.");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(restaurantService.uploadImage(principal.userId(), type, file)));
    }

    @GetMapping("/me/upi")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Get my restaurant UPI payment details")
    public ResponseEntity<ApiResponse<RestaurantUpiResponseDto>> getUpiDetails(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.getUpiDetails(principal.userId())));
    }

    @PutMapping("/me/upi")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Add or update my restaurant UPI payment details")
    public ResponseEntity<ApiResponse<RestaurantUpiResponseDto>> updateUpiDetails(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody RestaurantUpiRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.updateUpiDetails(principal.userId(), request)));
    }

    @PostMapping(value = { "/me/legal-details", "/me/business-details" })
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Create business and legal details for my restaurant")
    public ResponseEntity<ApiResponse<RestaurantLegalDetailResponseDto>> createLegalDetails(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody RestaurantLegalDetailRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(restaurantService.createLegalDetails(principal.userId(), request)));
    }

    @GetMapping(value = { "/me/legal-details", "/me/business-details" })
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Get business and legal details for my restaurant")
    public ResponseEntity<ApiResponse<RestaurantLegalDetailResponseDto>> getLegalDetails(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.getLegalDetails(principal.userId())));
    }

    @PutMapping(value = { "/me/legal-details", "/me/business-details" })
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Update business and legal details for my restaurant")
    public ResponseEntity<ApiResponse<RestaurantLegalDetailResponseDto>> updateLegalDetails(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody RestaurantLegalDetailRequestDto request) {
        return ResponseEntity
                .ok(ApiResponse.success(restaurantService.updateLegalDetails(principal.userId(), request)));
    }

    @GetMapping("/me/dashboard-summary")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Get dashboard summary metrics for my restaurant portal")
    public ResponseEntity<ApiResponse<RestaurantDashboardSummaryResponseDto>> getDashboardSummary(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return ResponseEntity.ok(ApiResponse.success(
                restaurantService.getDashboardSummary(principal.userId(), dateFrom, dateTo)));
    }

    @PostMapping("/me/resubmit")
    @PreAuthorize("hasRole('RESTAURANT')")
    @Operation(summary = "Resubmit restaurant KYC application after corrections")
    public ResponseEntity<ApiResponse<RestaurantDetailResponseDto>> resubmit(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(restaurantService.resubmit(principal.userId())));
    }
}
