package com.foodie.order.service.impl;

import com.foodie.order.repository.OrderRepository;
import com.foodie.shared.contract.OrderReviewQuery;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderReviewQueryImpl implements OrderReviewQuery {

    private final OrderRepository orderRepository;

    public OrderReviewQueryImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrderReviewSnapshot> findByOrderId(UUID orderId) {
        return orderRepository.findById(orderId).map(order -> new OrderReviewSnapshot(
                order.getId(),
                order.getCustomerId(),
                order.getRestaurantId(),
                order.getDeliveryPartnerId(),
                order.getStatus()
        ));
    }
}
