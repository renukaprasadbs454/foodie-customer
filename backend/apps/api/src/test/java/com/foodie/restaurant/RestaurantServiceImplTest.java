package com.foodie.restaurant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.enums.CuisineType;
import com.foodie.common.enums.RestaurantDocType;
import com.foodie.common.enums.RestaurantStatus;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.infrastructure.storage.ObjectStorageClient;
import com.foodie.restaurant.dto.request.CreateRestaurantRequestDto;
import com.foodie.restaurant.dto.request.RestaurantAddressRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantBankDetailsRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantLocationRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantRequestDto;
import com.foodie.restaurant.dto.request.VerifyUpiRequestDto;
import com.foodie.restaurant.dto.response.RestaurantDetailResponseDto;
import com.foodie.restaurant.dto.response.RestaurantLocationResponseDto;
import com.foodie.restaurant.dto.response.RestaurantBankDetailsResponseDto;
import com.foodie.restaurant.dto.response.VerificationResultResponseDto;
import com.foodie.restaurant.entity.Restaurant;
import com.foodie.restaurant.entity.RestaurantAddress;
import com.foodie.restaurant.entity.RestaurantBankDetails;
import com.foodie.restaurant.entity.RestaurantDocument;
import com.foodie.restaurant.mapper.RestaurantMapper;
import com.foodie.menu.repository.MenuItemRepository;
import com.foodie.order.repository.OrderRepository;
import com.foodie.restaurant.repository.RestaurantAddressRepository;
import com.foodie.restaurant.repository.RestaurantBankDetailsRepository;
import com.foodie.restaurant.repository.RestaurantDocumentRepository;
import com.foodie.restaurant.repository.RestaurantLegalDetailRepository;
import com.foodie.restaurant.repository.RestaurantRepository;
import com.foodie.restaurant.service.RestaurantCacheService;
import com.foodie.restaurant.service.impl.RestaurantServiceImpl;
import com.foodie.shared.event.RestaurantApprovedEvent;
import com.foodie.shared.event.RestaurantCreatedEvent;
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
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class RestaurantServiceImplTest {

    @Mock
    private RestaurantRepository restaurantRepository;
    @Mock
    private RestaurantAddressRepository restaurantAddressRepository;
    @Mock
    private RestaurantDocumentRepository restaurantDocumentRepository;
    @Mock
    private RestaurantLegalDetailRepository restaurantLegalDetailRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private MenuItemRepository menuItemRepository;
    @Mock
    private RestaurantBankDetailsRepository restaurantBankDetailsRepository;
    @Mock
    private ObjectStorageClient objectStorageClient;
    @Mock
    private RestaurantCacheService restaurantCacheService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private RestaurantServiceImpl service;
    private final UUID ownerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new RestaurantServiceImpl(
                restaurantRepository,
                restaurantAddressRepository,
                restaurantDocumentRepository,
                restaurantLegalDetailRepository,
                orderRepository,
                menuItemRepository,
                restaurantBankDetailsRepository,
                new RestaurantMapper(),
                objectStorageClient,
                restaurantCacheService,
                eventPublisher,
                new ObjectMapper().findAndRegisterModules(),
                new BigDecimal("18.00"));
    }

    @Test
    void create_ignoresClientCommission_andPublishesCreatedEvent() {
        when(restaurantRepository.existsByOwnerUserCredentialId(ownerId)).thenReturn(false);
        when(restaurantAddressRepository.save(any())).thenAnswer(inv -> {
            RestaurantAddress a = inv.getArgument(0);
            setId(a, UUID.randomUUID());
            return a;
        });
        when(restaurantRepository.save(any())).thenAnswer(inv -> {
            Restaurant r = inv.getArgument(0);
            setId(r, UUID.randomUUID());
            return r;
        });

        CreateRestaurantRequestDto request = new CreateRestaurantRequestDto(
                "Spice Route Kitchen",
                "Great food",
                List.of(CuisineType.SOUTH_INDIAN),
                addressDto(),
                new BigDecimal("5.00") // Client requested 5%
        );

        RestaurantDetailResponseDto dto = service.create(ownerId, request);

        assertThat(dto.commissionPct()).isEqualByComparingTo("18.00");
        assertThat(dto.status()).isEqualTo("PENDING");
        verify(eventPublisher).publishEvent(any(RestaurantCreatedEvent.class));
        verify(restaurantCacheService).evictAllListCaches();
    }

    @Test
    void getMyProfile_returnsOwnedRestaurantDetail() {
        Restaurant restaurant = pendingRestaurant();
        when(restaurantRepository.findByOwnerUserCredentialId(ownerId)).thenReturn(Optional.of(restaurant));

        RestaurantDetailResponseDto profile = service.getMyProfile(ownerId);

        assertThat(profile.restaurantId()).isEqualTo(restaurant.getId());
        assertThat(profile.name()).isEqualTo("Spice Route Kitchen");
        assertThat(profile.ownerUserCredentialId()).isEqualTo(ownerId);
    }

    @Test
    void getLocation_and_updateLocation_succeeds() {
        Restaurant restaurant = pendingRestaurant();
        when(restaurantRepository.findByOwnerUserCredentialId(ownerId)).thenReturn(Optional.of(restaurant));

        RestaurantLocationResponseDto location = service.getLocation(ownerId);
        assertThat(location.city()).isEqualTo("Bengaluru");
        assertThat(location.latitude()).isEqualByComparingTo("12.935200");

        UpdateRestaurantLocationRequestDto updateDto = new UpdateRestaurantLocationRequestDto(
                new BigDecimal("12.936000"),
                new BigDecimal("77.692000"),
                "124 MG Road",
                "5th Block",
                "Near Metro",
                "Bengaluru",
                "Karnataka",
                "India",
                "560095",
                "124 MG Road, 5th Block, Bengaluru, Karnataka - 560095, India");

        RestaurantLocationResponseDto updatedLocation = service.updateLocation(ownerId, updateDto);
        assertThat(updatedLocation.addressLine1()).isEqualTo("124 MG Road");
        assertThat(updatedLocation.landmark()).isEqualTo("Near Metro");
        assertThat(updatedLocation.formattedAddress()).contains("124 MG Road");
        verify(restaurantCacheService).evictRestaurant(restaurant.getId());
    }

    @Test
    void bankDetails_flow_getUpdateVerify() {
        Restaurant restaurant = pendingRestaurant();
        when(restaurantRepository.findByOwnerUserCredentialId(ownerId)).thenReturn(Optional.of(restaurant));
        when(restaurantBankDetailsRepository.findByRestaurantId(restaurant.getId())).thenReturn(Optional.empty());
        when(restaurantBankDetailsRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Get empty details
        RestaurantBankDetailsResponseDto emptyDetails = service.getBankDetails(ownerId);
        assertThat(emptyDetails.bankAccount().verificationStatus()).isEqualTo("NOT_SUBMITTED");

        // Update details
        UpdateRestaurantBankDetailsRequestDto updateDto = new UpdateRestaurantBankDetailsRequestDto(
                "Foodie Restaurant Pvt Ltd",
                "HDFC Bank",
                "98765432104521",
                "HDFC0001234",
                "CURRENT",
                "Koramangala 5th Block",
                "foodierestaurant@upi");
        RestaurantBankDetailsResponseDto updated = service.updateBankDetails(ownerId, updateDto);
        assertThat(updated.bankAccount().bankName()).isEqualTo("HDFC Bank");
        assertThat(updated.bankAccount().accountNumberMasked()).isEqualTo("XXXX XXXX 4521");
        assertThat(updated.bankAccount().verificationStatus()).isEqualTo("PENDING");
        assertThat(updated.upi().upiId()).isEqualTo("foodierestaurant@upi");

        // Verify bank details
        RestaurantBankDetails bankDetails = RestaurantBankDetails.createDefault(restaurant.getId());
        bankDetails.updateDetails("Foodie", "HDFC", "98765432104521", "HDFC0001234", "CURRENT", "Main", "foodie@upi");
        when(restaurantBankDetailsRepository.findByRestaurantId(restaurant.getId()))
                .thenReturn(Optional.of(bankDetails));

        VerificationResultResponseDto bankVerify = service.verifyBankDetails(ownerId);
        assertThat(bankVerify.status()).isEqualTo("VERIFIED");

        VerificationResultResponseDto upiVerify = service.verifyUpi(ownerId, new VerifyUpiRequestDto("foodie@upi"));
        assertThat(upiVerify.status()).isEqualTo("VERIFIED");
    }

    @Test
    void create_whenProfileAlreadyExists_throwsConflict() {
        when(restaurantRepository.existsByOwnerUserCredentialId(ownerId)).thenReturn(true);
        CreateRestaurantRequestDto request = new CreateRestaurantRequestDto(
                "Dup", null, List.of(CuisineType.NORTH_INDIAN), addressDto(), null);

        assertThatThrownBy(() -> service.create(ownerId, request))
                .isInstanceOf(ConflictException.class)
                .extracting(ex -> ((ConflictException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESTAURANT_PROFILE_ALREADY_EXISTS);
    }

    @Test
    void approve_fromPending_succeeds_andPublishesApprovedEvent() {
        Restaurant restaurant = pendingRestaurant();
        UUID adminId = UUID.randomUUID();
        when(restaurantRepository.findById(restaurant.getId())).thenReturn(Optional.of(restaurant));

        RestaurantDetailResponseDto dto = service.approve(restaurant.getId(), adminId);

        assertThat(dto.status()).isEqualTo("APPROVED");
        verify(eventPublisher).publishEvent(any(RestaurantApprovedEvent.class));
        verify(restaurantCacheService).evictRestaurant(restaurant.getId());
    }

    @Test
    void approve_nonPending_throwsUnprocessable() {
        Restaurant restaurant = pendingRestaurant();
        restaurant.approve();
        when(restaurantRepository.findById(restaurant.getId())).thenReturn(Optional.of(restaurant));

        assertThatThrownBy(() -> service.approve(restaurant.getId(), UUID.randomUUID()))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ILLEGAL_STATUS_TRANSITION);
    }

    @Test
    void updateMyRestaurant_updatesFields_preservesPendingAndCommission() {
        Restaurant restaurant = pendingRestaurant();
        when(restaurantRepository.findByOwnerUserCredentialId(ownerId)).thenReturn(Optional.of(restaurant));

        UpdateRestaurantRequestDto request = new UpdateRestaurantRequestDto(
                "New Name",
                "new desc",
                List.of(CuisineType.CHINESE, CuisineType.BIRYANI),
                new RestaurantAddressRequestDto(
                        "L1", null, "Bengaluru", "560001",
                        new BigDecimal("12.970000"), new BigDecimal("77.590000")));

        RestaurantDetailResponseDto dto = service.updateMyRestaurant(ownerId, request);

        assertThat(dto.name()).isEqualTo("New Name");
        assertThat(dto.status()).isEqualTo("PENDING");
        assertThat(dto.commissionPct()).isEqualByComparingTo("18.00");
        verify(restaurantCacheService).evictRestaurant(restaurant.getId());
    }

    @Test
    void uploadDocument_neverSelfVerifies() {
        Restaurant restaurant = pendingRestaurant();
        when(restaurantRepository.findByOwnerUserCredentialId(ownerId)).thenReturn(Optional.of(restaurant));
        when(restaurantDocumentRepository.save(any())).thenAnswer(inv -> {
            RestaurantDocument d = inv.getArgument(0);
            setId(d, UUID.randomUUID());
            return d;
        });

        byte[] pdf = "%PDF-1.4 mock content".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "fssai.pdf", "application/pdf", pdf);

        var response = service.uploadDocument(ownerId, RestaurantDocType.FSSAI, file);

        assertThat(response.docType()).isEqualTo("FSSAI");
        assertThat(response.verifiedAt()).isNull();
        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(objectStorageClient).putObject(keyCaptor.capture(), any(), any(Long.class), eq("application/pdf"));
        assertThat(keyCaptor.getValue()).contains("/documents/FSSAI/");
    }

    @Test
    void search_invalidSort_throws() {
        assertThatThrownBy(() -> service.search(null, null, null, null, null, 0, 20, "price"))
                .isInstanceOf(com.foodie.common.exception.BadRequestException.class)
                .extracting(ex -> ((com.foodie.common.exception.BadRequestException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_SORT_FIELD);
        verify(restaurantRepository, never()).searchApproved(any(), any(), any(), any());
    }

    @Test
    void getLegalDetails_whenMissing_returnsNull() {
        Restaurant restaurant = pendingRestaurant();
        when(restaurantRepository.findByOwnerUserCredentialId(ownerId)).thenReturn(Optional.of(restaurant));
        when(restaurantLegalDetailRepository.findByRestaurantId(restaurant.getId())).thenReturn(Optional.empty());

        var response = service.getLegalDetails(ownerId);

        assertThat(response).isNull();
    }

    @Test
    void createLegalDetails_whenExisting_updatesAndReturnsDto() {
        Restaurant restaurant = pendingRestaurant();
        when(restaurantRepository.findByOwnerUserCredentialId(ownerId)).thenReturn(Optional.of(restaurant));
        com.foodie.restaurant.entity.RestaurantLegalDetail existingDetail = com.foodie.restaurant.entity.RestaurantLegalDetail
                .create(
                        restaurant, "29ABCDE1234F1Z5", "ABCDE1234F", "12345678901234",
                        "Spice Legal", com.foodie.common.enums.RestaurantBusinessType.PRIVATE_LIMITED,
                        "contact@spice.com", "+919876543210");
        setId(existingDetail, UUID.randomUUID());
        when(restaurantLegalDetailRepository.findByRestaurantId(restaurant.getId()))
                .thenReturn(Optional.of(existingDetail));

        var request = new com.foodie.restaurant.dto.request.RestaurantLegalDetailRequestDto(
                "29ABCDE1234F1Z5", "ABCDE1234F", "12345678901234",
                "Updated Spice Legal", com.foodie.common.enums.RestaurantBusinessType.PRIVATE_LIMITED,
                "updated@spice.com", "+919876543210");

        var response = service.createLegalDetails(ownerId, request);

        assertThat(response).isNotNull();
        assertThat(response.legalName()).isEqualTo("Updated Spice Legal");
        assertThat(response.contactEmail()).isEqualTo("updated@spice.com");
    }

    @Test
    void reject_updatesStatusAndReason() {
        Restaurant restaurant = pendingRestaurant();
        UUID adminId = UUID.randomUUID();
        when(restaurantRepository.findById(restaurant.getId())).thenReturn(Optional.of(restaurant));

        RestaurantDetailResponseDto dto = service.reject(restaurant.getId(), adminId, "Document illegible");

        assertThat(dto.status()).isEqualTo("REJECTED");
        assertThat(restaurant.getStatus()).isEqualTo(RestaurantStatus.REJECTED);
        assertThat(restaurant.getRejectionReason()).isEqualTo("Document illegible");
        verify(restaurantCacheService).evictRestaurant(restaurant.getId());
    }

    @Test
    void resubmit_fromRejected_resetsToPending() {
        Restaurant restaurant = pendingRestaurant();
        restaurant.reject("Fix GST");
        when(restaurantRepository.findByOwnerUserCredentialId(ownerId)).thenReturn(Optional.of(restaurant));

        RestaurantDetailResponseDto dto = service.resubmit(ownerId);

        assertThat(dto.status()).isEqualTo("PENDING");
        assertThat(restaurant.getStatus()).isEqualTo(RestaurantStatus.PENDING);
        assertThat(restaurant.getRejectionReason()).isNull();
        verify(restaurantCacheService).evictRestaurant(restaurant.getId());
    }

    private Restaurant pendingRestaurant() {
        RestaurantAddress address = RestaurantAddress.create(
                "L1", null, "Bengaluru", "560103",
                new BigDecimal("12.935200"), new BigDecimal("77.691200"));
        setId(address, UUID.randomUUID());
        Restaurant restaurant = Restaurant.createPending(
                ownerId,
                "Spice Route Kitchen",
                "desc",
                new String[] { "SOUTH_INDIAN" },
                address,
                new BigDecimal("18.00"));
        setId(restaurant, UUID.randomUUID());
        return restaurant;
    }

    private static RestaurantAddressRequestDto addressDto() {
        return new RestaurantAddressRequestDto(
                "Flat 1", null, "Bengaluru", "560103",
                new BigDecimal("12.935200"), new BigDecimal("77.691200"));
    }

    private static void setId(Object entity, UUID id) {
        try {
            var field = entity.getClass().getSuperclass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
