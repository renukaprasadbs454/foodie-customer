package com.foodie.order.service;

import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.OrderActorType;
import com.foodie.common.enums.OrderStatus;
import com.foodie.common.enums.UserType;
import com.foodie.order.dto.request.CreateOrderRequestDto;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.order.dto.response.OrderSummaryResponseDto;
import java.util.List;
import java.util.UUID;

public interface OrderService {

    OrderResponseDto createFromCart(UUID userCredentialId, CreateOrderRequestDto request, String idempotencyKey);

    OrderResponseDto getById(UUID orderId, UUID userCredentialId, UserType userType);

    OrderResponseDto getActiveOrderForCustomer(UUID userCredentialId);

    OrderResponseDto cancelOrder(UUID orderId, UUID userCredentialId, String reason);

    PageResult<OrderSummaryResponseDto> listForCustomer(
            UUID userCredentialId,
            OrderStatus statusFilter,
            int page,
            int size,
            String sort
    );

    PageResult<OrderSummaryResponseDto> listForRestaurant(
            UUID ownerUserCredentialId,
            OrderStatus statusFilter,
            int page,
            int size,
            String sort
    );

    OrderResponseDto transition(
            UUID orderId,
            OrderStatus targetStatus,
            String reason,
            UUID actorUserCredentialId,
            UserType userType
    );

    /** Payment module / PaymentCapturedEvent — SYSTEM PLACED→CONFIRMED. */
    OrderResponseDto confirmAfterPayment(UUID orderId);

    record PageResult<T>(List<T> items, PaginationMeta pagination) {
    }

    record ActorContext(OrderActorType actorType, UUID actorId) {
    }
}
