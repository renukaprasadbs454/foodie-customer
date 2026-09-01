package com.foodie.order.service.impl;

import com.foodie.common.enums.OrderActorType;
import com.foodie.common.enums.OrderStatus;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.order.entity.Order;
import com.foodie.order.entity.OrderStatusEvent;
import com.foodie.order.repository.OrderRepository;
import com.foodie.order.repository.OrderStatusEventRepository;
import com.foodie.order.statemachine.OrderStateMachine;
import com.foodie.shared.contract.OrderDeliveryPort;
import com.foodie.shared.event.OrderDeliveredEvent;
import com.foodie.shared.event.OrderStatusChangedEvent;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderDeliveryPortImpl implements OrderDeliveryPort {

    private final OrderRepository orderRepository;
    private final OrderStatusEventRepository orderStatusEventRepository;
    private final ApplicationEventPublisher eventPublisher;

    public OrderDeliveryPortImpl(
            OrderRepository orderRepository,
            OrderStatusEventRepository orderStatusEventRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.orderRepository = orderRepository;
        this.orderStatusEventRepository = orderStatusEventRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrderDeliverySnapshot> findByOrderId(UUID orderId) {
        return orderRepository.findById(orderId)
                .map(order -> new OrderDeliverySnapshot(
                        order.getId(),
                        order.getRestaurantId(),
                        order.getStatus(),
                        order.getDeliveryPartnerId()
                ));
    }

    @Override
    @Transactional
    public void assignPartner(UUID orderId, UUID deliveryPartnerId) {
        Order order = require(orderId);
        apply(order, OrderStatus.ASSIGNED, null);
        order.assignDeliveryPartner(deliveryPartnerId);
    }

    @Override
    @Transactional
    public void markPickedUpAndOutForDelivery(UUID orderId) {
        Order order = require(orderId);
        apply(order, OrderStatus.PICKED_UP, null);
        apply(order, OrderStatus.OUT_FOR_DELIVERY, null);
    }

    @Override
    @Transactional
    public void markDelivered(UUID orderId) {
        Order order = require(orderId);
        apply(order, OrderStatus.DELIVERED, null);
        eventPublisher.publishEvent(OrderDeliveredEvent.of(orderId));
    }

    private void apply(Order order, OrderStatus target, String reason) {
        OrderStateMachine.Decision decision =
                OrderStateMachine.evaluate(order.getStatus(), target, OrderActorType.SYSTEM);
        if (decision != OrderStateMachine.Decision.ALLOW) {
            throw new UnprocessableEntityException(
                    ErrorCode.ILLEGAL_STATUS_TRANSITION,
                    "Transition from " + order.getStatus() + " to " + target + " is not allowed."
            );
        }
        OrderStatus from = order.getStatus();
        order.transitionTo(target);
        orderStatusEventRepository.save(OrderStatusEvent.append(
                order.getId(), from, target, OrderActorType.SYSTEM, null, reason));
        eventPublisher.publishEvent(OrderStatusChangedEvent.of(order.getId(), from, target));
    }

    private Order require(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
    }
}
