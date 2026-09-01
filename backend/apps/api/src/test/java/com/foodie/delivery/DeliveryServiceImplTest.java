package com.foodie.delivery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.auth.exception.InvalidOtpException;
import com.foodie.common.enums.DeliveryAssignmentStatus;
import com.foodie.common.enums.KycStatus;
import com.foodie.common.enums.VehicleType;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.delivery.config.DeliveryProperties;
import com.foodie.delivery.dto.request.LocationPingRequestDto;
import com.foodie.delivery.dto.request.SetAvailabilityRequestDto;
import com.foodie.delivery.dto.request.VerifyOtpRequestDto;
import com.foodie.delivery.dto.response.DeliveryAssignmentResponseDto;
import com.foodie.delivery.entity.DeliveryAssignment;
import com.foodie.delivery.entity.DeliveryPartner;
import com.foodie.delivery.mapper.DeliveryMapper;
import com.foodie.delivery.repository.DeliveryAssignmentRepository;
import com.foodie.delivery.repository.DeliveryPartnerDocumentRepository;
import com.foodie.delivery.repository.DeliveryPartnerRepository;
import com.foodie.delivery.service.PartnerGeoService;
import com.foodie.delivery.service.impl.DeliveryServiceImpl;
import com.foodie.infrastructure.storage.ObjectStorageClient;
import com.foodie.security.ratelimit.RedisRateLimiter;
import com.foodie.shared.contract.OrderDeliveryPort;
import com.foodie.shared.contract.RestaurantPickupQuery;
import com.foodie.shared.event.DeliveryLocationUpdatedEvent;
import com.foodie.shared.event.DeliveryPartnerAssignedEvent;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class DeliveryServiceImplTest {

    @Mock
    private DeliveryPartnerRepository deliveryPartnerRepository;
    @Mock
    private DeliveryPartnerDocumentRepository deliveryPartnerDocumentRepository;
    @Mock
    private DeliveryAssignmentRepository deliveryAssignmentRepository;
    @Mock
    private ObjectStorageClient objectStorageClient;
    @Mock
    private PartnerGeoService partnerGeoService;
    @Mock
    private OrderDeliveryPort orderDeliveryPort;
    @Mock
    private RestaurantPickupQuery restaurantPickupQuery;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private RedisRateLimiter redisRateLimiter;
    @Mock
    private com.foodie.delivery.service.DeliveryPricingService deliveryPricingService;

    private DeliveryServiceImpl service;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final UUID userCredentialId = UUID.randomUUID();
    private final UUID partnerId = UUID.randomUUID();
    private final UUID assignmentId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        DeliveryProperties properties = new DeliveryProperties();
        properties.setOfferRadiusKm(5.0);
        service = new DeliveryServiceImpl(
                deliveryPartnerRepository,
                deliveryPartnerDocumentRepository,
                deliveryAssignmentRepository,
                new DeliveryMapper(),
                objectStorageClient,
                partnerGeoService,
                orderDeliveryPort,
                restaurantPickupQuery,
                eventPublisher,
                passwordEncoder,
                redisRateLimiter,
                properties,
                deliveryPricingService
        );
    }

    @Test
    void setAvailability_whenKycNotVerified_blocksGoingOnline() {
        DeliveryPartner partner = pendingPartner();
        when(deliveryPartnerRepository.findByUserCredentialId(userCredentialId)).thenReturn(Optional.of(partner));

        assertThatThrownBy(() -> service.setAvailability(userCredentialId, new SetAvailabilityRequestDto(true)))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.KYC_NOT_VERIFIED);
    }

    @Test
    void accept_whenOffered_assignsPartnerAndPublishesEvent() {
        DeliveryPartner partner = verifiedPartner();
        DeliveryAssignment assignment = offeredAssignment(partner);
        when(deliveryPartnerRepository.findByUserCredentialId(userCredentialId)).thenReturn(Optional.of(partner));
        when(deliveryAssignmentRepository.findByIdAndDeliveryPartnerId(assignmentId, partnerId))
                .thenReturn(Optional.of(assignment));
        when(deliveryAssignmentRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        DeliveryAssignmentResponseDto response = service.accept(userCredentialId, assignmentId);

        assertThat(response.status()).isEqualTo("ACCEPTED");
        verify(orderDeliveryPort).assignPartner(orderId, partnerId);
        verify(eventPublisher).publishEvent(any(DeliveryPartnerAssignedEvent.class));
    }

    @Test
    void verifyPickup_withInvalidOtp_throwsInvalidOtp() {
        DeliveryPartner partner = verifiedPartner();
        DeliveryAssignment assignment = acceptedAssignment(partner, passwordEncoder.encode("123456"));
        when(deliveryPartnerRepository.findByUserCredentialId(userCredentialId)).thenReturn(Optional.of(partner));
        when(deliveryAssignmentRepository.findByIdAndDeliveryPartnerId(assignmentId, partnerId))
                .thenReturn(Optional.of(assignment));

        assertThatThrownBy(() -> service.verifyPickup(
                userCredentialId,
                assignmentId,
                new VerifyOtpRequestDto("000000")))
                .isInstanceOf(InvalidOtpException.class);

        verify(orderDeliveryPort, never()).markPickedUpAndOutForDelivery(any());
    }

    @Test
    void locationPing_whenPickedUp_publishesLocationUpdatedEvent() {
        DeliveryPartner partner = verifiedPartner();
        DeliveryAssignment assignment = pickedUpAssignment(partner);
        when(deliveryPartnerRepository.findByUserCredentialId(userCredentialId)).thenReturn(Optional.of(partner));
        when(deliveryAssignmentRepository.findFirstByDeliveryPartnerIdAndStatusIn(
                partnerId, List.of(DeliveryAssignmentStatus.PICKED_UP)))
                .thenReturn(Optional.of(assignment));

        service.locationPing(userCredentialId, new LocationPingRequestDto(
                new BigDecimal("12.9352"),
                new BigDecimal("77.6912")
        ));

        ArgumentCaptor<DeliveryLocationUpdatedEvent> captor =
                ArgumentCaptor.forClass(DeliveryLocationUpdatedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().orderId()).isEqualTo(orderId);
        assertThat(captor.getValue().latitude()).isEqualTo(12.9352);
        assertThat(captor.getValue().longitude()).isEqualTo(77.6912);
        verify(partnerGeoService).addLocation(eq(partnerId), eq(12.9352), eq(77.6912));
    }

    private DeliveryPartner pendingPartner() {
        DeliveryPartner partner = DeliveryPartner.create(userCredentialId, "Alex Rider", VehicleType.BIKE, "KA01AB1234");
        setId(partner, partnerId);
        return partner;
    }

    private DeliveryPartner verifiedPartner() {
        DeliveryPartner partner = pendingPartner();
        partner.verifyKyc();
        return partner;
    }

    private DeliveryAssignment offeredAssignment(DeliveryPartner partner) {
        DeliveryAssignment assignment = DeliveryAssignment.createOffered(
                orderId,
                partner,
                passwordEncoder.encode("111111"),
                passwordEncoder.encode("222222")
        );
        setId(assignment, assignmentId);
        return assignment;
    }

    private DeliveryAssignment acceptedAssignment(DeliveryPartner partner, String pickupHash) {
        DeliveryAssignment assignment = DeliveryAssignment.createOffered(
                orderId,
                partner,
                pickupHash,
                passwordEncoder.encode("222222")
        );
        assignment.accept();
        setId(assignment, assignmentId);
        return assignment;
    }

    private DeliveryAssignment pickedUpAssignment(DeliveryPartner partner) {
        DeliveryAssignment assignment = acceptedAssignment(partner, passwordEncoder.encode("111111"));
        assignment.markPickupVerified();
        return assignment;
    }

    private static void setId(Object entity, UUID id) {
        try {
            Field field = entity.getClass().getSuperclass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
