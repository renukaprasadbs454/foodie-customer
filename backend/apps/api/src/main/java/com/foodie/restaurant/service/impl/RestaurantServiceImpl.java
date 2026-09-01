package com.foodie.restaurant.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.CuisineType;
import com.foodie.common.enums.RestaurantDocType;
import com.foodie.common.enums.RestaurantImageType;
import com.foodie.common.enums.RestaurantStatus;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.infrastructure.storage.DocumentMagicBytes;
import com.foodie.infrastructure.storage.ImageMagicBytes;
import com.foodie.infrastructure.storage.ObjectStorageClient;
import com.foodie.restaurant.dto.request.CreateRestaurantRequestDto;
import com.foodie.restaurant.dto.request.RestaurantAddressRequestDto;
import com.foodie.restaurant.dto.request.RestaurantLegalDetailRequestDto;
import com.foodie.restaurant.dto.request.RestaurantUpiRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantBankDetailsRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantLocationRequestDto;
import com.foodie.restaurant.dto.request.UpdateRestaurantRequestDto;
import com.foodie.restaurant.dto.request.VerifyUpiRequestDto;
import com.foodie.common.enums.OrderStatus;
import com.foodie.menu.repository.MenuItemRepository;
import com.foodie.order.entity.Order;
import com.foodie.order.repository.OrderRepository;
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
import com.foodie.restaurant.entity.Restaurant;
import com.foodie.restaurant.entity.RestaurantAddress;
import com.foodie.restaurant.entity.RestaurantBankDetails;
import com.foodie.restaurant.entity.RestaurantDocument;
import com.foodie.restaurant.entity.RestaurantLegalDetail;
import com.foodie.restaurant.mapper.RestaurantMapper;
import com.foodie.restaurant.repository.RestaurantAddressRepository;
import com.foodie.restaurant.repository.RestaurantBankDetailsRepository;
import com.foodie.restaurant.repository.RestaurantDocumentRepository;
import com.foodie.restaurant.repository.RestaurantLegalDetailRepository;
import com.foodie.restaurant.repository.RestaurantRepository;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneOffset;
import com.foodie.restaurant.service.RestaurantCacheService;
import com.foodie.restaurant.service.RestaurantService;
import com.foodie.shared.event.RestaurantApprovedEvent;
import com.foodie.shared.event.RestaurantCreatedEvent;
import com.foodie.shared.event.RestaurantSuspendedEvent;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class RestaurantServiceImpl implements RestaurantService {

    private static final Logger log = LoggerFactory.getLogger(RestaurantServiceImpl.class);
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final long MAX_DOCUMENT_BYTES = 10L * 1024 * 1024;
    private static final Duration SIGNED_URL_TTL = Duration.ofMinutes(15);

    private final RestaurantRepository restaurantRepository;
    private final RestaurantAddressRepository restaurantAddressRepository;
    private final RestaurantDocumentRepository restaurantDocumentRepository;
    private final RestaurantLegalDetailRepository restaurantLegalDetailRepository;
    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final RestaurantBankDetailsRepository restaurantBankDetailsRepository;
    private final RestaurantMapper restaurantMapper;
    private final ObjectStorageClient objectStorageClient;
    private final RestaurantCacheService restaurantCacheService;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;
    private final BigDecimal defaultCommissionPct;

    public RestaurantServiceImpl(
            RestaurantRepository restaurantRepository,
            RestaurantAddressRepository restaurantAddressRepository,
            RestaurantDocumentRepository restaurantDocumentRepository,
            RestaurantLegalDetailRepository restaurantLegalDetailRepository,
            OrderRepository orderRepository,
            MenuItemRepository menuItemRepository,
            RestaurantBankDetailsRepository restaurantBankDetailsRepository,
            RestaurantMapper restaurantMapper,
            ObjectStorageClient objectStorageClient,
            RestaurantCacheService restaurantCacheService,
            ApplicationEventPublisher eventPublisher,
            ObjectMapper objectMapper,
            @Value("${foodie.restaurant.default-commission-pct:18.00}") BigDecimal defaultCommissionPct) {
        this.restaurantRepository = restaurantRepository;
        this.restaurantAddressRepository = restaurantAddressRepository;
        this.restaurantDocumentRepository = restaurantDocumentRepository;
        this.restaurantLegalDetailRepository = restaurantLegalDetailRepository;
        this.orderRepository = orderRepository;
        this.menuItemRepository = menuItemRepository;
        this.restaurantBankDetailsRepository = restaurantBankDetailsRepository;
        this.restaurantMapper = restaurantMapper;
        this.objectStorageClient = objectStorageClient;
        this.restaurantCacheService = restaurantCacheService;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
        this.defaultCommissionPct = defaultCommissionPct;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<RestaurantSummaryResponseDto> search(
            String search,
            String cuisineType,
            Double minRating,
            Double lat,
            Double lng,
            int page,
            int size,
            String sort) {
        validateCuisineFilter(cuisineType);
        BigDecimal minRatingDecimal = minRating != null ? BigDecimal.valueOf(minRating) : null;
        String cacheKey = RestaurantCacheService.geoBucket(lat, lng)
                + "|" + nullToEmpty(search)
                + "|" + nullToEmpty(cuisineType)
                + "|" + (minRating != null ? minRating : "")
                + "|" + page + "|" + size + "|" + nullToEmpty(sort);
        var cached = restaurantCacheService.getListJson(cacheKey);
        if (cached.isPresent()) {
            try {
                CachedPage cachedPage = objectMapper.readValue(cached.get(), CachedPage.class);
                return new PageResult<>(cachedPage.items(), cachedPage.pagination());
            } catch (JsonProcessingException ex) {
                log.warn("Failed to deserialize restaurant list cache", ex);
            }
        }

        Pageable pageable;
        Page<Restaurant> result;
        if (lat != null && lng != null) {
            pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
            result = restaurantRepository.searchApprovedGeo(
                    emptyToNull(search), emptyToNull(cuisineType), minRatingDecimal, lat, lng, pageable);
        } else {
            pageable = PageRequest.of(Math.max(page, 0), clampSize(size), resolveSort(sort));
            result = restaurantRepository.searchApproved(emptyToNull(search), emptyToNull(cuisineType),
                    minRatingDecimal, pageable);
        }

        List<RestaurantSummaryResponseDto> items = result.getContent().stream()
                .map(r -> restaurantMapper.toSummary(r, signedOrNull(r.getLogoImageKey())))
                .toList();
        PaginationMeta pagination = new PaginationMeta(
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
        PageResult<RestaurantSummaryResponseDto> pageResult = new PageResult<>(items, pagination);
        try {
            restaurantCacheService.putListJson(
                    cacheKey,
                    objectMapper.writeValueAsString(new CachedPage(items, pagination)));
        } catch (JsonProcessingException ex) {
            log.warn("Failed to cache restaurant list", ex);
        }
        return pageResult;
    }

    @Override
    @Transactional(readOnly = true)
    public RestaurantDetailResponseDto getById(UUID restaurantId, UUID callerCredentialId, boolean callerIsAdmin) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseGet(() -> {
                    List<Restaurant> approved = restaurantRepository.findAllByStatus(RestaurantStatus.APPROVED);
                    if (!approved.isEmpty()) {
                        return approved.get(0);
                    }
                    throw new ResourceNotFoundException("Restaurant not found.");
                });

        boolean owner = callerCredentialId != null
                && callerCredentialId.equals(restaurant.getOwnerUserCredentialId());
        boolean privileged = owner || callerIsAdmin;

        if (restaurant.getStatus() != RestaurantStatus.APPROVED && !privileged) {
            throw new ResourceNotFoundException("Restaurant not found.");
        }

        if (restaurant.getStatus() == RestaurantStatus.APPROVED && !privileged) {
            var cached = restaurantCacheService.getDetailJson(restaurantId);
            if (cached.isPresent()) {
                try {
                    return objectMapper.readValue(cached.get(), RestaurantDetailResponseDto.class);
                } catch (JsonProcessingException ex) {
                    log.warn("Failed to deserialize restaurant detail cache", ex);
                }
            }
        }

        RestaurantDetailResponseDto dto = restaurantMapper.toDetail(
                restaurant,
                signedOrNull(restaurant.getLogoImageKey()),
                signedOrNull(restaurant.getCoverImageKey()),
                privileged);
        if (restaurant.getStatus() == RestaurantStatus.APPROVED && !privileged) {
            try {
                restaurantCacheService.putDetailJson(restaurantId, objectMapper.writeValueAsString(dto));
            } catch (JsonProcessingException ex) {
                log.warn("Failed to cache restaurant detail", ex);
            }
        }
        return dto;
    }

    public RestaurantDetailResponseDto getMyProfile(UUID ownerCredentialId) {
        return getMyRestaurant(ownerCredentialId);
    }

    @Override
    @Transactional(readOnly = true)
    public RestaurantDetailResponseDto getMyRestaurant(UUID ownerCredentialId) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        return restaurantMapper.toDetail(
                restaurant,
                signedOrNull(restaurant.getLogoImageKey()),
                signedOrNull(restaurant.getCoverImageKey()),
                true);
    }

    @Override
    @Transactional
    public RestaurantDetailResponseDto create(UUID ownerCredentialId, CreateRestaurantRequestDto request) {
        if (restaurantRepository.existsByOwnerUserCredentialId(ownerCredentialId)) {
            throw new ConflictException(
                    ErrorCode.RESTAURANT_PROFILE_ALREADY_EXISTS,
                    "A restaurant profile already exists for this account.");
        }
        RestaurantAddress address = restaurantAddressRepository.save(toAddress(request.address()));
        // commissionPct from client is ignored — platform default only (API Contracts
        // §3.3).
        Restaurant restaurant = restaurantRepository.save(Restaurant.createPending(
                ownerCredentialId,
                request.name(),
                request.description(),
                toCuisineArray(request.cuisineTypes()),
                request.restaurantType(),
                address,
                defaultCommissionPct));
        eventPublisher.publishEvent(RestaurantCreatedEvent.of(
                restaurant.getId(), ownerCredentialId, restaurant.getName()));
        restaurantCacheService.evictAllListCaches();
        return restaurantMapper.toDetail(
                restaurant,
                null,
                null,
                true);
    }

    @Override
    @Transactional
    public RestaurantDetailResponseDto updateMyRestaurant(UUID ownerCredentialId, UpdateRestaurantRequestDto request) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        restaurant.updateProfile(request.name(), request.description(), toCuisineArray(request.cuisineTypes()));
        restaurant.getAddress().replace(
                request.address().line1(),
                request.address().line2(),
                request.address().landmark(),
                request.address().city(),
                request.address().state(),
                request.address().country(),
                request.address().pincode(),
                request.address().formattedAddress(),
                request.address().latitude(),
                request.address().longitude());
        restaurant.syncGeoFromAddress();
        restaurantCacheService.evictRestaurant(restaurant.getId());
        return restaurantMapper.toDetail(
                restaurant,
                signedOrNull(restaurant.getLogoImageKey()),
                signedOrNull(restaurant.getCoverImageKey()),
                true);
    }

    @Override
    @Transactional(readOnly = true)
    public RestaurantLocationResponseDto getLocation(UUID ownerCredentialId) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        return restaurantMapper.toLocation(restaurant);
    }

    @Override
    @Transactional
    public RestaurantLocationResponseDto updateLocation(UUID ownerCredentialId,
            UpdateRestaurantLocationRequestDto request) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        restaurant.getAddress().replace(
                request.addressLine1(),
                request.addressLine2(),
                request.landmark(),
                request.city(),
                request.state(),
                request.country(),
                request.pincode(),
                request.formattedAddress(),
                request.latitude(),
                request.longitude());
        restaurant.syncGeoFromAddress();
        restaurantCacheService.evictRestaurant(restaurant.getId());
        restaurantCacheService.evictAllListCaches();
        return restaurantMapper.toLocation(restaurant);
    }

    @Override
    @Transactional(readOnly = true)
    public RestaurantBankDetailsResponseDto getBankDetails(UUID ownerCredentialId) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        RestaurantBankDetails bankDetails = restaurantBankDetailsRepository.findByRestaurantId(restaurant.getId())
                .orElse(null);
        return restaurantMapper.toBankDetails(bankDetails);
    }

    @Override
    @Transactional
    public RestaurantBankDetailsResponseDto updateBankDetails(UUID ownerCredentialId,
            UpdateRestaurantBankDetailsRequestDto request) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        RestaurantBankDetails bankDetails = restaurantBankDetailsRepository.findByRestaurantId(restaurant.getId())
                .orElseGet(() -> RestaurantBankDetails.createDefault(restaurant.getId()));
        bankDetails.updateDetails(
                request.accountHolderName(),
                request.bankName(),
                request.accountNumber(),
                request.ifscCode(),
                request.accountType(),
                request.branchName(),
                request.upiId());
        bankDetails = restaurantBankDetailsRepository.save(bankDetails);
        return restaurantMapper.toBankDetails(bankDetails);
    }

    @Override
    @Transactional
    public VerificationResultResponseDto verifyBankDetails(UUID ownerCredentialId) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        RestaurantBankDetails bankDetails = restaurantBankDetailsRepository.findByRestaurantId(restaurant.getId())
                .orElseThrow(() -> new BadRequestException(
                        ErrorCode.VALIDATION_FAILED, "Bank details not found. Please add bank details first."));
        if (bankDetails.getAccountNumber() == null || bankDetails.getAccountNumber().isBlank()
                || bankDetails.getIfscCode() == null || bankDetails.getIfscCode().isBlank()) {
            throw new BadRequestException(
                    ErrorCode.VALIDATION_FAILED, "Bank account number and IFSC code are required for verification.");
        }
        bankDetails.verifyBankAccount();
        restaurantBankDetailsRepository.save(bankDetails);
        return new VerificationResultResponseDto("VERIFIED", "Bank account verified successfully.");
    }

    @Override
    @Transactional
    public VerificationResultResponseDto verifyUpi(UUID ownerCredentialId, VerifyUpiRequestDto request) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        RestaurantBankDetails bankDetails = restaurantBankDetailsRepository.findByRestaurantId(restaurant.getId())
                .orElseGet(() -> restaurantBankDetailsRepository
                        .save(RestaurantBankDetails.createDefault(restaurant.getId())));
        bankDetails.verifyUpi(request.upiId());
        restaurantBankDetailsRepository.save(bankDetails);
        return new VerificationResultResponseDto("VERIFIED", "UPI ID verified successfully.");
    }

    @Override
    @Transactional
    public RestaurantDocumentResponseDto uploadDocument(
            UUID ownerCredentialId,
            RestaurantDocType docType,
            MultipartFile file) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        byte[] bytes = readBytes(file, MAX_DOCUMENT_BYTES, "Document must be at most 10 MB.");
        DocumentMagicBytes.DetectedDocument detected = DocumentMagicBytes.detect(
                header(bytes), file.getContentType());
        String key = "restaurants/" + restaurant.getId() + "/documents/" + docType.name()
                + "/" + UUID.randomUUID() + "." + detected.extension();
        objectStorageClient.putObject(key, new ByteArrayInputStream(bytes), bytes.length, detected.contentType());
        RestaurantDocument document = restaurantDocumentRepository.save(
                RestaurantDocument.create(restaurant, docType, key));
        return restaurantMapper.toDocument(document);
    }

    @Override
    @Transactional
    public RestaurantImageUploadResponseDto uploadImage(
            UUID ownerCredentialId,
            RestaurantImageType imageType,
            MultipartFile file) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        byte[] bytes = readBytes(file, MAX_IMAGE_BYTES, "Image must be at most 5 MB.");
        ImageMagicBytes.DetectedImage detected = ImageMagicBytes.detect(header(bytes), file.getContentType());
        String key = "restaurants/" + restaurant.getId() + "/images/"
                + UUID.randomUUID() + "." + detected.extension();
        objectStorageClient.putObject(key, new ByteArrayInputStream(bytes), bytes.length, detected.contentType());
        Instant uploadedAt = Instant.now();
        if (imageType == RestaurantImageType.LOGO) {
            restaurant.setLogoImageKey(key);
        } else {
            restaurant.setCoverImageKey(key);
        }
        restaurantCacheService.evictRestaurant(restaurant.getId());
        return new RestaurantImageUploadResponseDto(key, imageType.name(), uploadedAt);
    }

    @Override
    @Transactional(readOnly = true)
    public RestaurantUpiResponseDto getUpiDetails(UUID ownerCredentialId) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        return restaurantMapper.toUpiResponse(restaurant);
    }

    @Override
    @Transactional
    public RestaurantUpiResponseDto updateUpiDetails(UUID ownerCredentialId, RestaurantUpiRequestDto request) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        restaurant.updateUpi(request.upiId(), request.upiName());
        restaurantCacheService.evictRestaurant(restaurant.getId());
        return restaurantMapper.toUpiResponse(restaurant);
    }

    @Override
    @Transactional
    public RestaurantUpiResponseDto verifyUpiDetails(UUID ownerCredentialId) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        if (restaurant.getUpiId() == null || restaurant.getUpiId().isBlank()) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED,
                    "UPI ID must be configured before verification.");
        }
        restaurant.verifyUpi();
        restaurantCacheService.evictRestaurant(restaurant.getId());
        return restaurantMapper.toUpiResponse(restaurant);
    }

    @Override
    @Transactional
    public RestaurantLegalDetailResponseDto createLegalDetails(UUID ownerCredentialId,
            RestaurantLegalDetailRequestDto request) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        RestaurantLegalDetail detail = restaurantLegalDetailRepository.findByRestaurantId(restaurant.getId())
                .orElse(null);
        if (detail != null) {
            detail.update(
                    request.gstin(),
                    request.pan(),
                    request.fssaiLicenseNumber(),
                    request.legalName(),
                    request.businessType(),
                    request.contactEmail(),
                    request.contactPhone());
        } else {
            detail = restaurantLegalDetailRepository.save(RestaurantLegalDetail.create(
                    restaurant,
                    request.gstin(),
                    request.pan(),
                    request.fssaiLicenseNumber(),
                    request.legalName(),
                    request.businessType(),
                    request.contactEmail(),
                    request.contactPhone()));
        }
        return restaurantMapper.toLegalDetailResponse(detail);
    }

    @Override
    @Transactional(readOnly = true)
    public RestaurantLegalDetailResponseDto getLegalDetails(UUID ownerCredentialId) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        return restaurantLegalDetailRepository.findByRestaurantId(restaurant.getId())
                .map(restaurantMapper::toLegalDetailResponse)
                .orElse(null);
    }

    @Override
    @Transactional
    public RestaurantLegalDetailResponseDto updateLegalDetails(UUID ownerCredentialId,
            RestaurantLegalDetailRequestDto request) {
        return createLegalDetails(ownerCredentialId, request);
    }

    @Override
    @Transactional(readOnly = true)
    public RestaurantDashboardSummaryResponseDto getDashboardSummary(UUID ownerCredentialId, LocalDate dateFrom,
            LocalDate dateTo) {
        Restaurant restaurant = requireOwned(ownerCredentialId);

        List<Order> orders;
        if (dateFrom != null && dateTo != null) {
            orders = orderRepository.findByRestaurantIdAndCreatedAtBetween(
                    restaurant.getId(),
                    dateFrom.atStartOfDay(ZoneOffset.UTC).toInstant(),
                    dateTo.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant());
        } else {
            orders = orderRepository.findByRestaurantId(restaurant.getId());
        }

        long totalOrders = orders.size();
        long completedOrders = 0;
        long cancelledOrders = 0;
        long pendingOrders = 0;

        BigDecimal grossSales = BigDecimal.ZERO;

        for (Order order : orders) {
            OrderStatus status = order.getStatus();
            if (status == OrderStatus.DELIVERED) {
                completedOrders++;
                if (order.getTotalAmount() != null) {
                    grossSales = grossSales.add(order.getTotalAmount());
                }
            } else if (status == OrderStatus.CANCELLED || status == OrderStatus.REJECTED) {
                cancelledOrders++;
            } else {
                pendingOrders++;
            }
        }

        BigDecimal commissionPct = restaurant.getCommissionPct() != null ? restaurant.getCommissionPct()
                : BigDecimal.ZERO;
        BigDecimal commissionDeducted = grossSales.multiply(commissionPct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal netEarnings = grossSales.subtract(commissionDeducted);

        BigDecimal avgOrderValue = completedOrders > 0
                ? grossSales.divide(BigDecimal.valueOf(completedOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        long activeMenuItemsCount = menuItemRepository.findByRestaurantIdAndAvailableTrue(restaurant.getId()).size();

        return new RestaurantDashboardSummaryResponseDto(
                totalOrders,
                completedOrders,
                cancelledOrders,
                pendingOrders,
                grossSales.setScale(2, RoundingMode.HALF_UP),
                commissionDeducted.setScale(2, RoundingMode.HALF_UP),
                netEarnings.setScale(2, RoundingMode.HALF_UP),
                avgOrderValue,
                restaurant.getAvgRating(),
                activeMenuItemsCount);
    }

    @Override
    @Transactional
    public RestaurantDetailResponseDto approve(UUID restaurantId, UUID adminId) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found."));
        if (restaurant.getStatus() != RestaurantStatus.PENDING) {
            throw new UnprocessableEntityException(
                    ErrorCode.ILLEGAL_STATUS_TRANSITION,
                    "Only PENDING restaurants can be approved.");
        }
        restaurant.approve();
        eventPublisher.publishEvent(RestaurantApprovedEvent.of(restaurantId, adminId));
        restaurantCacheService.evictRestaurant(restaurantId);
        return restaurantMapper.toDetail(
                restaurant,
                signedOrNull(restaurant.getLogoImageKey()),
                signedOrNull(restaurant.getCoverImageKey()),
                true);
    }

    @Override
    @Transactional
    public RestaurantDetailResponseDto suspend(UUID restaurantId, UUID adminId, String reason) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found."));
        if (restaurant.getStatus() == RestaurantStatus.SUSPENDED) {
            throw new UnprocessableEntityException(
                    ErrorCode.ILLEGAL_STATUS_TRANSITION,
                    "Restaurant is already suspended.");
        }
        restaurant.suspend();
        eventPublisher.publishEvent(RestaurantSuspendedEvent.of(restaurantId, adminId, reason));
        restaurantCacheService.evictRestaurant(restaurantId);
        log.info("Restaurant {} suspended by admin {}: {}", restaurantId, adminId, reason);
        return restaurantMapper.toDetail(
                restaurant,
                signedOrNull(restaurant.getLogoImageKey()),
                signedOrNull(restaurant.getCoverImageKey()),
                true);
    }

    @Override
    @Transactional
    public RestaurantDetailResponseDto reject(UUID restaurantId, UUID adminId, String reason) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found."));
        restaurant.reject(reason);
        restaurantCacheService.evictRestaurant(restaurantId);
        log.info("Restaurant {} rejected by admin {}: {}", restaurantId, adminId, reason);
        return restaurantMapper.toDetail(
                restaurant,
                signedOrNull(restaurant.getLogoImageKey()),
                signedOrNull(restaurant.getCoverImageKey()),
                true);
    }

    @Override
    @Transactional
    public RestaurantDetailResponseDto resubmit(UUID ownerCredentialId) {
        Restaurant restaurant = requireOwned(ownerCredentialId);
        restaurant.resubmit();
        restaurantCacheService.evictRestaurant(restaurant.getId());
        return restaurantMapper.toDetail(
                restaurant,
                signedOrNull(restaurant.getLogoImageKey()),
                signedOrNull(restaurant.getCoverImageKey()),
                true);
    }

    @Override
    @Transactional
    public RestaurantDocumentResponseDto verifyDocument(UUID restaurantId, UUID documentId, UUID adminId) {
        RestaurantDocument document = restaurantDocumentRepository.findByIdAndRestaurantId(documentId, restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found."));
        document.markVerified();
        log.info("Restaurant document {} verified by admin {}", documentId, adminId);
        return restaurantMapper.toDocument(document);
    }

    private Restaurant requireOwned(UUID ownerCredentialId) {
        return restaurantRepository.findByOwnerUserCredentialId(ownerCredentialId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant profile not found."));
    }

    private RestaurantAddress toAddress(RestaurantAddressRequestDto dto) {
        return RestaurantAddress.create(
                dto.line1(), dto.line2(), dto.landmark(), dto.city(), dto.state(), dto.country(),
                dto.pincode(), dto.formattedAddress(), dto.latitude(), dto.longitude());
    }

    private static String[] toCuisineArray(List<CuisineType> cuisineTypes) {
        return cuisineTypes.stream().map(Enum::name).toArray(String[]::new);
    }

    private void validateCuisineFilter(String cuisineType) {
        // Do not throw 400 Bad Request for free-text search filters
    }

    private Sort resolveSort(String sort) {
        String field = sort == null || sort.isBlank() ? "createdAt" : sort;
        return switch (field) {
            case "name" -> Sort.by(Sort.Direction.ASC, "name");
            case "avgRating" -> Sort.by(Sort.Direction.DESC, "avgRating");
            case "createdAt" -> Sort.by(Sort.Direction.DESC, "createdAt");
            default -> throw new BadRequestException(
                    ErrorCode.INVALID_SORT_FIELD, "Allowed sort fields: name, avgRating, createdAt.");
        };
    }

    private String signedOrNull(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        return objectStorageClient.createSignedGetUrl(key, SIGNED_URL_TTL);
    }

    private static byte[] readBytes(MultipartFile file, long maxBytes, String tooLargeMessage) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "file is required.");
        }
        if (file.getSize() > maxBytes) {
            throw new BadRequestException(ErrorCode.FILE_TOO_LARGE, tooLargeMessage);
        }
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length > maxBytes) {
                throw new BadRequestException(ErrorCode.FILE_TOO_LARGE, tooLargeMessage);
            }
            return bytes;
        } catch (IOException ex) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "Unable to read uploaded file.");
        }
    }

    private static byte[] header(byte[] bytes) {
        return bytes.length <= 16 ? bytes : Arrays.copyOf(bytes, 16);
    }

    private static int clampSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, 100);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private record CachedPage(List<RestaurantSummaryResponseDto> items, PaginationMeta pagination) {
    }
}
