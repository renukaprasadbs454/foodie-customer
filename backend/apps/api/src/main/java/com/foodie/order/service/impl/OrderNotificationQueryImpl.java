package com.foodie.order.service.impl;

import com.foodie.order.repository.OrderRepository;
import com.foodie.shared.contract.OrderNotificationQuery;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderNotificationQueryImpl implements OrderNotificationQuery {

    private final OrderRepository orderRepository;

    public OrderNotificationQueryImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrderNotifySnapshot> findByOrderId(UUID orderId) {
        return orderRepository.findById(orderId).map(order -> new OrderNotifySnapshot(
                order.getId(),
                order.getOrderNumber(),
                order.getCustomerId(),
                order.getRestaurantId(),
                order.getDeliveryPartnerId(),
                order.getStatus()
        ));
    }
}
