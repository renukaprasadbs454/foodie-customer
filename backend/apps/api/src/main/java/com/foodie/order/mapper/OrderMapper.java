package com.foodie.order.mapper;

import com.foodie.order.dto.response.OrderItemResponseDto;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.order.dto.response.OrderStatusEventResponseDto;
import com.foodie.order.dto.response.OrderSummaryResponseDto;
import com.foodie.order.entity.Order;
import com.foodie.order.entity.OrderItem;
import com.foodie.order.entity.OrderStatusEvent;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class OrderMapper {

    public OrderResponseDto toDetail(
            Order order,
            List<OrderItem> items,
            List<OrderStatusEvent> events,
            Map<UUID, String> itemNames
    ) {
        List<OrderItemResponseDto> itemDtos = items.stream()
                .map(item -> new OrderItemResponseDto(
                        item.getMenuItemId(),
                        item.getVariantId(),
                        itemNames.getOrDefault(item.getMenuItemId(), "Menu item"),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getLineTotal()
                ))
                .toList();
        List<OrderStatusEventResponseDto> eventDtos = events.stream()
                .map(event -> new OrderStatusEventResponseDto(
                        event.getId(),
                        event.getFromStatus(),
                        event.getToStatus(),
                        event.getActorType(),
                        event.getActorId(),
                        event.getReason(),
                        event.getCreatedAt()
                ))
                .toList();
        return new OrderResponseDto(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus(),
                order.getCustomerId(),
                order.getRestaurantId(),
                order.getAddressId(),
                order.getSubtotal(),
                order.getDeliveryFee(),
                order.getDiscountAmount(),
                order.getTaxAmount(),
                order.getTotalAmount(),
                order.getPlacedAt(),
                itemDtos,
                eventDtos
        );
    }

    public OrderSummaryResponseDto toSummary(Order order) {
        return new OrderSummaryResponseDto(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus(),
                order.getRestaurantId(),
                order.getTotalAmount(),
                order.getPlacedAt()
        );
    }
}
