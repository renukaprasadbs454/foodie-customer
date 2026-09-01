package com.foodie.order.repository;

import com.foodie.order.entity.OrderStatusEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderStatusEventRepository extends JpaRepository<OrderStatusEvent, UUID> {

    List<OrderStatusEvent> findByOrderIdOrderByCreatedAtAsc(UUID orderId);
}
