package com.foodie.admin.service;

import com.foodie.admin.dto.request.FlagReviewRequestDto;
import com.foodie.admin.dto.request.OverrideOrderStatusRequestDto;
import com.foodie.admin.dto.request.SuspendRestaurantRequestDto;
import com.foodie.admin.dto.response.AuditLogResponseDto;
import com.foodie.admin.dto.response.ModerationResponseDto;
import com.foodie.common.dto.PaginationMeta;
import com.foodie.coupon.dto.request.CreateCouponRequestDto;
import com.foodie.coupon.dto.response.CouponResponseDto;
import com.foodie.coupon.dto.response.DeactivateCouponResponseDto;
import com.foodie.delivery.dto.response.DeliveryProfileResponseDto;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.restaurant.dto.response.RestaurantDetailResponseDto;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AdminOperationsService {

        RestaurantDetailResponseDto approveRestaurant(UUID actorCredentialId, UUID restaurantId);

        RestaurantDetailResponseDto suspendRestaurant(
                        UUID actorCredentialId, UUID restaurantId, SuspendRestaurantRequestDto request);

        RestaurantDetailResponseDto rejectRestaurant(
                        UUID actorCredentialId, UUID restaurantId, String reason);

        DeliveryProfileResponseDto approveDeliveryKyc(UUID actorCredentialId, UUID partnerId);

        CouponResponseDto createCoupon(UUID actorCredentialId, CreateCouponRequestDto request);

        DeactivateCouponResponseDto deactivateCoupon(UUID actorCredentialId, UUID couponId);

        OrderResponseDto overrideOrderStatus(
                        UUID actorCredentialId, UUID orderId, OverrideOrderStatusRequestDto request);

        ModerationResponseDto flagReview(UUID actorCredentialId, UUID reviewId, FlagReviewRequestDto request);

        ModerationResponseDto clearReviewFlag(UUID actorCredentialId, UUID reviewId);

        PageResult<AuditLogResponseDto> listAuditLogs(
                        UUID actorCredentialId,
                        String resourceType,
                        UUID resourceId,
                        UUID adminUserId,
                        Instant createdAtFrom,
                        Instant createdAtTo,
                        int page,
                        int size,
                        String sort);

        record PageResult<T>(List<T> items, PaginationMeta pagination) {
        }
}
