package com.foodie.restaurant.service;

import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.RestaurantDocType;
import com.foodie.common.enums.RestaurantImageType;
import com.foodie.restaurant.dto.request.CreateRestaurantRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantBankDetailsRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantLocationRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantRequestDto;
import com.foodie.restaurant.dto.request.VerifyUpiRequestDto;
import com.foodie.restaurant.dto.response.RestaurantBankDetailsResponseDto;
import com.foodie.restaurant.dto.response.RestaurantDetailResponseDto;
import com.foodie.restaurant.dto.response.RestaurantDocumentResponseDto;
import com.foodie.restaurant.dto.response.RestaurantImageUploadResponseDto;
import com.foodie.restaurant.dto.response.RestaurantLocationResponseDto;
import com.foodie.restaurant.dto.response.RestaurantSummaryResponseDto;
import com.foodie.restaurant.dto.response.VerificationResultResponseDto;
import java.util.List;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

import com.foodie.restaurant.dto.request.RestaurantLegalDetailRequestDto;
import com.foodie.restaurant.dto.request.RestaurantUpiRequestDto;
import com.foodie.restaurant.dto.response.RestaurantDashboardSummaryResponseDto;
import com.foodie.restaurant.dto.response.RestaurantLegalDetailResponseDto;
import com.foodie.restaurant.dto.response.RestaurantUpiResponseDto;
import java.time.LocalDate;

public interface RestaurantService {

        record PageResult<T>(List<T> items, PaginationMeta pagination) {
        }

        PageResult<RestaurantSummaryResponseDto> search(
                        String search,
                        String cuisineType,
                        Double minRating,
                        Double lat,
                        Double lng,
                        int page,
                        int size,
                        String sort);

        RestaurantDetailResponseDto getById(UUID restaurantId, UUID callerCredentialId, boolean callerIsAdmin);

        RestaurantDetailResponseDto getMyProfile(UUID ownerCredentialId);

        RestaurantDetailResponseDto getMyRestaurant(UUID ownerCredentialId);

        RestaurantDetailResponseDto create(UUID ownerCredentialId, CreateRestaurantRequestDto request);

        RestaurantDetailResponseDto updateMyRestaurant(UUID ownerCredentialId, UpdateRestaurantRequestDto request);

        RestaurantLocationResponseDto getLocation(UUID ownerCredentialId);

        RestaurantLocationResponseDto updateLocation(UUID ownerCredentialId,
                        UpdateRestaurantLocationRequestDto request);

        RestaurantBankDetailsResponseDto getBankDetails(UUID ownerCredentialId);

        RestaurantBankDetailsResponseDto updateBankDetails(UUID ownerCredentialId,
                        UpdateRestaurantBankDetailsRequestDto request);

        VerificationResultResponseDto verifyBankDetails(UUID ownerCredentialId);

        VerificationResultResponseDto verifyUpi(UUID ownerCredentialId, VerifyUpiRequestDto request);

        RestaurantDocumentResponseDto uploadDocument(
                        UUID ownerCredentialId,
                        RestaurantDocType docType,
                        MultipartFile file);

        RestaurantImageUploadResponseDto uploadImage(
                        UUID ownerCredentialId,
                        RestaurantImageType imageType,
                        MultipartFile file);

        RestaurantUpiResponseDto getUpiDetails(UUID ownerCredentialId);

        RestaurantUpiResponseDto updateUpiDetails(UUID ownerCredentialId, RestaurantUpiRequestDto request);

        RestaurantUpiResponseDto verifyUpiDetails(UUID ownerCredentialId);

        RestaurantLegalDetailResponseDto createLegalDetails(UUID ownerCredentialId,
                        RestaurantLegalDetailRequestDto request);

        RestaurantLegalDetailResponseDto getLegalDetails(UUID ownerCredentialId);

        RestaurantLegalDetailResponseDto updateLegalDetails(UUID ownerCredentialId,
                        RestaurantLegalDetailRequestDto request);

        RestaurantDashboardSummaryResponseDto getDashboardSummary(UUID ownerCredentialId, LocalDate dateFrom,
                        LocalDate dateTo);

        /**
         * Invoked by Admin module (Phase3 §2.3 / API §13.1) — not exposed as restaurant
         * HTTP in Module 3.
         */
        RestaurantDetailResponseDto approve(UUID restaurantId, UUID adminId);

        /** Invoked by Admin module (Phase3 §2.3 / API §13.2). */
        RestaurantDetailResponseDto suspend(UUID restaurantId, UUID adminId, String reason);

        RestaurantDetailResponseDto reject(UUID restaurantId, UUID adminId, String reason);

        RestaurantDetailResponseDto resubmit(UUID ownerCredentialId);

        /** Document verification for Admin Ops — sets verified_at. */
        RestaurantDocumentResponseDto verifyDocument(UUID restaurantId, UUID documentId, UUID adminId);
}
