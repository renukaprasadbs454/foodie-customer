package com.foodie.order.service.impl;

import com.foodie.order.repository.OrderRepository;
import com.foodie.shared.contract.OrderDeliveryFeeQuery;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderDeliveryFeeQueryImpl implements OrderDeliveryFeeQuery {

    private final OrderRepository orderRepository;

    public OrderDeliveryFeeQueryImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BigDecimal> findDeliveryFeeByOrderId(UUID orderId) {
        return orderRepository.findById(orderId).map(order -> order.getDeliveryFee());
    }
}
