package com.foodie.delivery.service;

import com.foodie.common.enums.DeliveryDocType;
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
import java.util.List;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

public interface DeliveryService {

        DeliveryProfileResponseDto getOrCreateProfile(UUID userCredentialId);

        DeliveryProfileResponseDto upsertProfile(UUID userCredentialId, UpsertDeliveryProfileRequestDto request);

        DeliveryDocumentResponseDto uploadDocument(
                        UUID userCredentialId,
                        DeliveryDocType docType,
                        MultipartFile file);

        DeliveryProfileImageResponseDto uploadProfileImage(
                        UUID userCredentialId,
                        MultipartFile file);

        AvailabilityResponseDto setAvailability(UUID userCredentialId, SetAvailabilityRequestDto request);

        List<DeliveryOfferResponseDto> listOffers(UUID userCredentialId);

        DeliveryAssignmentResponseDto accept(UUID userCredentialId, UUID assignmentId);

        DeliveryAssignmentResponseDto verifyPickup(UUID userCredentialId, UUID assignmentId,
                        VerifyOtpRequestDto request);

        DeliveryAssignmentResponseDto verifyDelivery(UUID userCredentialId, UUID assignmentId,
                        VerifyOtpRequestDto request);

        void locationPing(UUID userCredentialId, LocationPingRequestDto request);

        void createAssignmentForOrder(UUID orderId);

        DeliveryProfileResponseDto verifyKyc(UUID partnerId, UUID adminId);

        boolean verifyFace(UUID userCredentialId, MultipartFile file);
}
