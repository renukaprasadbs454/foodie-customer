package com.foodie.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.admin.dto.request.OverrideOrderStatusRequestDto;
import com.foodie.admin.dto.request.SuspendRestaurantRequestDto;
import com.foodie.admin.entity.AdminRoleName;
import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.entity.Role;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.repository.AuditLogRepository;
import com.foodie.admin.service.AdminService;
import com.foodie.admin.service.impl.AdminOperationsServiceImpl;
import com.foodie.common.enums.OrderStatus;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.ForbiddenException;
import com.foodie.coupon.service.CouponAdminService;
import com.foodie.delivery.dto.response.DeliveryProfileResponseDto;
import com.foodie.delivery.service.DeliveryService;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.order.service.OrderService;
import com.foodie.restaurant.dto.response.RestaurantDetailResponseDto;
import com.foodie.restaurant.service.RestaurantService;
import com.foodie.review.service.ReviewService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminOperationsServiceImplTest {

        @Mock
        private AdminUserRepository adminUserRepository;
        @Mock
        private AuditLogRepository auditLogRepository;
        @Mock
        private AdminService adminService;
        @Mock
        private RestaurantService restaurantService;
        @Mock
        private DeliveryService deliveryService;
        @Mock
        private CouponAdminService couponAdminService;
        @Mock
        private OrderService orderService;
        @Mock
        private ReviewService reviewService;

        private AdminOperationsServiceImpl service;

        private final UUID credentialId = UUID.randomUUID();
        private final UUID adminUserId = UUID.randomUUID();
        private final UUID restaurantId = UUID.randomUUID();

        @BeforeEach
        void setUp() {
                service = new AdminOperationsServiceImpl(
                                adminUserRepository,
                                auditLogRepository,
                                adminService,
                                restaurantService,
                                deliveryService,
                                couponAdminService,
                                orderService,
                                reviewService,
                                new ObjectMapper().findAndRegisterModules());
        }

        @Test
        void approveRestaurant_callsRestaurantServiceAndAudits() {
                stubAdminWithPermission("RESTAURANT", "APPROVE");
                when(restaurantService.getById(restaurantId, credentialId, true)).thenReturn(detail("PENDING"));
                when(restaurantService.approve(restaurantId, adminUserId)).thenReturn(detail("APPROVED"));

                RestaurantDetailResponseDto result = service.approveRestaurant(credentialId, restaurantId);

                assertThat(result.status()).isEqualTo("APPROVED");
                verify(adminService).recordAudit(
                                eq(adminUserId), eq("APPROVE_RESTAURANT"), eq("RESTAURANT"), eq(restaurantId), any(),
                                any());
        }

        @Test
        void approveRestaurant_withoutPermission_forbidden() {
                AdminUser admin = admin(AdminRoleName.SUPPORT);
                when(adminUserRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.of(admin));
                when(adminService.hasPermission(adminUserId, "RESTAURANT", "APPROVE")).thenReturn(false);

                assertThatThrownBy(() -> service.approveRestaurant(credentialId, restaurantId))
                                .isInstanceOf(ForbiddenException.class);
                verify(restaurantService, never()).approve(any(), any());
        }

        @Test
        void suspendRestaurant_delegatesWithReason() {
                stubAdminWithPermission("RESTAURANT", "SUSPEND");
                when(restaurantService.getById(restaurantId, credentialId, true)).thenReturn(detail("APPROVED"));
                when(restaurantService.suspend(restaurantId, adminUserId, "hygiene"))
                                .thenReturn(detail("SUSPENDED"));

                var result = service.suspendRestaurant(
                                credentialId, restaurantId, new SuspendRestaurantRequestDto("hygiene"));

                assertThat(result.status()).isEqualTo("SUSPENDED");
                verify(adminService).recordAudit(
                                eq(adminUserId), eq("SUSPEND_RESTAURANT"), eq("RESTAURANT"), eq(restaurantId), any(),
                                any());
        }

        @Test
        void approveDeliveryKyc_delegates() {
                UUID partnerId = UUID.randomUUID();
                stubAdminWithPermission("DELIVERY", "KYC_APPROVE");
                when(deliveryService.verifyKyc(partnerId, adminUserId)).thenReturn(
                                new DeliveryProfileResponseDto(
                                                partnerId, "Driver", "BIKE", "KA01", "VERIFIED", false, null,
                                                List.of()));

                var result = service.approveDeliveryKyc(credentialId, partnerId);

                assertThat(result.kycStatus()).isEqualTo("VERIFIED");
                verify(adminService).recordAudit(
                                eq(adminUserId), eq("APPROVE_DELIVERY_KYC"), eq("DELIVERY_PARTNER"), eq(partnerId),
                                any(), any());
        }

        @Test
        void overrideOrderStatus_usesAdminActor() {
                UUID orderId = UUID.randomUUID();
                stubAdminWithPermission("ORDER", "OVERRIDE");
                OrderResponseDto before = order(orderId, OrderStatus.CONFIRMED);
                OrderResponseDto after = order(orderId, OrderStatus.CANCELLED);
                when(orderService.getById(orderId, credentialId, UserType.ADMIN)).thenReturn(before);
                when(orderService.transition(
                                orderId, OrderStatus.CANCELLED, "duplicate", credentialId, UserType.ADMIN))
                                .thenReturn(after);

                var result = service.overrideOrderStatus(
                                credentialId, orderId,
                                new OverrideOrderStatusRequestDto(OrderStatus.CANCELLED, "duplicate"));

                assertThat(result.status()).isEqualTo(OrderStatus.CANCELLED);
                verify(adminService).recordAudit(
                                eq(adminUserId), eq("OVERRIDE_ORDER_STATUS"), eq("ORDER"), eq(orderId), any(), any());
        }

        @Test
        void flagReview_delegatesToReviewService() {
                UUID reviewId = UUID.randomUUID();
                stubAdminWithPermission("REVIEW", "MODERATE");

                var result = service.flagReview(
                                credentialId, reviewId, new com.foodie.admin.dto.request.FlagReviewRequestDto("spam"));

                assertThat(result.flagged()).isTrue();
                verify(reviewService).flagForModeration(reviewId, "spam");
        }

        private void stubAdminWithPermission(String resource, String action) {
                AdminUser admin = admin(AdminRoleName.OPS);
                when(adminUserRepository.findByUserCredentialId(credentialId)).thenReturn(Optional.of(admin));
                when(adminService.hasPermission(adminUserId, resource, action)).thenReturn(true);
        }

        private AdminUser admin(AdminRoleName roleName) {
                Role role = Role.ref(UUID.randomUUID(), roleName);
                AdminUser admin = AdminUser.create(credentialId, role, "Admin");
                ReflectionTestUtils.setField(admin, "id", adminUserId);
                return admin;
        }

        private static RestaurantDetailResponseDto detail(String status) {
                return new RestaurantDetailResponseDto(
                                UUID.randomUUID(), "R", null, List.of("INDIAN"), null,
                                BigDecimal.ONE, BigDecimal.ONE, null, null, BigDecimal.ZERO,
                                status, new BigDecimal("18.00"), UUID.randomUUID());
        }

        private static OrderResponseDto order(UUID orderId, OrderStatus status) {
                return new OrderResponseDto(
                                orderId,
                                "FD-1",
                                status,
                                UUID.randomUUID(),
                                UUID.randomUUID(),
                                UUID.randomUUID(),
                                new BigDecimal("100.00"),
                                new BigDecimal("30.00"),
                                BigDecimal.ZERO,
                                new BigDecimal("5.00"),
                                new BigDecimal("135.00"),
                                java.time.Instant.now(),
                                List.of(),
                                List.of());
        }
}
