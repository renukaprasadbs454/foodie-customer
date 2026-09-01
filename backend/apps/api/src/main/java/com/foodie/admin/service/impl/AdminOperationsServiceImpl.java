package com.foodie.admin.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.admin.dto.request.FlagReviewRequestDto;
import com.foodie.admin.dto.request.OverrideOrderStatusRequestDto;
import com.foodie.admin.dto.request.SuspendRestaurantRequestDto;
import com.foodie.admin.dto.response.AuditLogResponseDto;
import com.foodie.admin.dto.response.ModerationResponseDto;
import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.AuditLog;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.AuditLogRepository;
import com.foodie.admin.service.AdminOperationsService;
import com.foodie.admin.service.AdminService;
import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ForbiddenException;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.coupon.dto.request.CreateCouponRequestDto;
import com.foodie.coupon.dto.response.CouponResponseDto;
import com.foodie.coupon.dto.response.DeactivateCouponResponseDto;
import com.foodie.coupon.service.CouponAdminService;
import com.foodie.delivery.dto.response.DeliveryProfileResponseDto;
import com.foodie.delivery.service.DeliveryService;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.order.service.OrderService;
import com.foodie.restaurant.dto.response.RestaurantDetailResponseDto;
import com.foodie.restaurant.service.RestaurantService;
import com.foodie.review.service.ReviewService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminOperationsServiceImpl implements AdminOperationsService {

    private final AdminUserRepository adminUserRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminService adminService;
    private final RestaurantService restaurantService;
    private final DeliveryService deliveryService;
    private final CouponAdminService couponAdminService;
    private final OrderService orderService;
    private final ReviewService reviewService;
    private final ObjectMapper objectMapper;

    public AdminOperationsServiceImpl(
            AdminUserRepository adminUserRepository,
            AuditLogRepository auditLogRepository,
            AdminService adminService,
            RestaurantService restaurantService,
            DeliveryService deliveryService,
            CouponAdminService couponAdminService,
            OrderService orderService,
            ReviewService reviewService,
            ObjectMapper objectMapper) {
        this.adminUserRepository = adminUserRepository;
        this.auditLogRepository = auditLogRepository;
        this.adminService = adminService;
        this.restaurantService = restaurantService;
        this.deliveryService = deliveryService;
        this.couponAdminService = couponAdminService;
        this.orderService = orderService;
        this.reviewService = reviewService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public RestaurantDetailResponseDto approveRestaurant(UUID actorCredentialId, UUID restaurantId) {
        AdminUser admin = requirePermission(actorCredentialId, "RESTAURANT", "APPROVE");
        RestaurantDetailResponseDto before = restaurantService.getById(restaurantId, actorCredentialId, true);
        RestaurantDetailResponseDto after = restaurantService.approve(restaurantId, admin.getId());
        adminService.recordAudit(
                admin.getId(),
                "APPROVE_RESTAURANT",
                "RESTAURANT",
                restaurantId,
                Map.of("status", before.status()),
                Map.of("status", after.status()));
        return after;
    }

    @Override
    @Transactional
    public RestaurantDetailResponseDto suspendRestaurant(
            UUID actorCredentialId, UUID restaurantId, SuspendRestaurantRequestDto request) {
        AdminUser admin = requirePermission(actorCredentialId, "RESTAURANT", "SUSPEND");
        RestaurantDetailResponseDto before = restaurantService.getById(restaurantId, actorCredentialId, true);
        RestaurantDetailResponseDto after = restaurantService.suspend(restaurantId, admin.getId(), request.reason());
        adminService.recordAudit(
                admin.getId(),
                "SUSPEND_RESTAURANT",
                "RESTAURANT",
                restaurantId,
                Map.of("status", before.status()),
                Map.of("status", after.status(), "reason", request.reason()));
        return after;
    }

    @Override
    @Transactional
    public RestaurantDetailResponseDto rejectRestaurant(
            UUID actorCredentialId, UUID restaurantId, String reason) {
        AdminUser admin = requirePermission(actorCredentialId, "RESTAURANT", "APPROVE");
        RestaurantDetailResponseDto before = restaurantService.getById(restaurantId, actorCredentialId, true);
        RestaurantDetailResponseDto after = restaurantService.reject(restaurantId, admin.getId(), reason);
        adminService.recordAudit(
                admin.getId(),
                "REJECT_RESTAURANT",
                "RESTAURANT",
                restaurantId,
                Map.of("status", before.status()),
                Map.of("status", after.status(), "reason", reason));
        return after;
    }

    @Override
    @Transactional
    public DeliveryProfileResponseDto approveDeliveryKyc(UUID actorCredentialId, UUID partnerId) {
        AdminUser admin = requirePermission(actorCredentialId, "DELIVERY", "KYC_APPROVE");
        DeliveryProfileResponseDto after = deliveryService.verifyKyc(partnerId, admin.getId());
        adminService.recordAudit(
                admin.getId(),
                "APPROVE_DELIVERY_KYC",
                "DELIVERY_PARTNER",
                partnerId,
                Map.of("kycStatus", "PENDING"),
                Map.of("kycStatus", after.kycStatus()));
        return after;
    }

    @Override
    @Transactional
    public CouponResponseDto createCoupon(UUID actorCredentialId, CreateCouponRequestDto request) {
        AdminUser admin = requirePermission(actorCredentialId, "COUPON", "CREATE");
        CouponResponseDto created = couponAdminService.create(request);
        adminService.recordAudit(
                admin.getId(),
                "CREATE_COUPON",
                "COUPON",
                created.couponId(),
                null,
                created);
        return created;
    }

    @Override
    @Transactional
    public DeactivateCouponResponseDto deactivateCoupon(UUID actorCredentialId, UUID couponId) {
        AdminUser admin = requirePermission(actorCredentialId, "COUPON", "DEACTIVATE");
        DeactivateCouponResponseDto after = couponAdminService.deactivate(couponId);
        adminService.recordAudit(
                admin.getId(),
                "DEACTIVATE_COUPON",
                "COUPON",
                couponId,
                Map.of("isActive", true),
                Map.of("isActive", after.isActive()));
        return after;
    }

    @Override
    @Transactional
    public OrderResponseDto overrideOrderStatus(
            UUID actorCredentialId, UUID orderId, OverrideOrderStatusRequestDto request) {
        AdminUser admin = requirePermission(actorCredentialId, "ORDER", "OVERRIDE");
        OrderResponseDto before = orderService.getById(orderId, actorCredentialId, UserType.ADMIN);
        OrderResponseDto after = orderService.transition(
                orderId,
                request.targetStatus(),
                request.reason(),
                actorCredentialId,
                UserType.ADMIN);
        adminService.recordAudit(
                admin.getId(),
                "OVERRIDE_ORDER_STATUS",
                "ORDER",
                orderId,
                Map.of("status", before.status().name()),
                Map.of("status", after.status().name(), "reason", request.reason()));
        return after;
    }

    @Override
    @Transactional
    public ModerationResponseDto flagReview(
            UUID actorCredentialId, UUID reviewId, FlagReviewRequestDto request) {
        AdminUser admin = requirePermission(actorCredentialId, "REVIEW", "MODERATE");
        reviewService.flagForModeration(reviewId, request.reason());
        adminService.recordAudit(
                admin.getId(),
                "FLAG_REVIEW",
                "REVIEW",
                reviewId,
                Map.of("flagged", false),
                Map.of("flagged", true, "reason", request.reason()));
        return new ModerationResponseDto(reviewId, true);
    }

    @Override
    @Transactional
    public ModerationResponseDto clearReviewFlag(UUID actorCredentialId, UUID reviewId) {
        AdminUser admin = requirePermission(actorCredentialId, "REVIEW", "MODERATE");
        reviewService.clearModerationFlag(reviewId);
        adminService.recordAudit(
                admin.getId(),
                "CLEAR_REVIEW_FLAG",
                "REVIEW",
                reviewId,
                Map.of("flagged", true),
                Map.of("flagged", false));
        return new ModerationResponseDto(reviewId, false);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<AuditLogResponseDto> listAuditLogs(
            UUID actorCredentialId,
            String resourceType,
            UUID resourceId,
            UUID adminUserId,
            Instant createdAtFrom,
            Instant createdAtTo,
            int page,
            int size,
            String sort) {
        AdminUser admin = requireAdmin(actorCredentialId);
        if (!adminService.hasPermission(admin.getId(), "AUDIT", "READ")) {
            throw new ForbiddenException("SUPER_ADMIN required to view audit logs.");
        }
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), resolveSort(sort));
        Page<AuditLog> result = auditLogRepository.search(
                blankToNull(resourceType),
                resourceId,
                adminUserId,
                createdAtFrom,
                createdAtTo,
                pageable);
        List<AuditLogResponseDto> items = result.getContent().stream().map(this::toAuditDto).toList();
        return new PageResult<>(items, new PaginationMeta(
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()));
    }

    private AdminUser requirePermission(UUID actorCredentialId, String resource, String action) {
        AdminUser admin = requireAdmin(actorCredentialId);
        if (!adminService.hasPermission(admin.getId(), resource, action)) {
            throw new ForbiddenException("Insufficient admin role for this action.");
        }
        return admin;
    }

    private AdminUser requireAdmin(UUID actorCredentialId) {
        return adminUserRepository.findByUserCredentialId(actorCredentialId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Admin profile not found for this credential."));
    }

    private AuditLogResponseDto toAuditDto(AuditLog log) {
        return new AuditLogResponseDto(
                log.getId(),
                log.getAdminUserId(),
                log.getAction(),
                log.getResourceType(),
                log.getResourceId(),
                parseJson(log.getBeforeState()),
                parseJson(log.getAfterState()),
                log.getCreatedAt());
    }

    private Object parseJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            return json;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static int clampSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, 100);
    }

    private static Sort resolveSort(String sort) {
        if (sort == null || sort.isBlank() || "createdAt".equals(sort) || "-createdAt".equals(sort)) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        if ("+createdAt".equals(sort)) {
            return Sort.by(Sort.Direction.ASC, "createdAt");
        }
        throw new BadRequestException(ErrorCode.INVALID_SORT_FIELD, "Allowed sort fields: createdAt.");
    }
}
