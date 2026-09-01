package com.foodie.order.repository;

import com.foodie.common.enums.OrderStatus;
import com.foodie.order.entity.Order;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByIdempotencyKey(String idempotencyKey);

    Page<Order> findByCustomerId(UUID customerId, Pageable pageable);

    Page<Order> findByCustomerIdAndStatus(UUID customerId, OrderStatus status, Pageable pageable);

    java.util.List<Order> findByCustomerIdAndStatusIn(UUID customerId, java.util.Collection<OrderStatus> statuses);

    Page<Order> findByRestaurantId(UUID restaurantId, Pageable pageable);

    Page<Order> findByRestaurantIdAndStatus(UUID restaurantId, OrderStatus status, Pageable pageable);

    java.util.List<Order> findByRestaurantId(UUID restaurantId);

    java.util.List<Order> findByRestaurantIdAndCreatedAtBetween(UUID restaurantId, java.time.Instant from, java.time.Instant to);
}
