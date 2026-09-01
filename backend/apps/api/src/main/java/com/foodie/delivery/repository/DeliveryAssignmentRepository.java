package com.foodie.delivery.repository;

import com.foodie.common.enums.DeliveryAssignmentStatus;
import com.foodie.delivery.entity.DeliveryAssignment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, UUID> {

    Optional<DeliveryAssignment> findByIdAndDeliveryPartnerId(UUID id, UUID deliveryPartnerId);

    List<DeliveryAssignment> findByDeliveryPartnerIdAndStatus(UUID deliveryPartnerId, DeliveryAssignmentStatus status);

    Optional<DeliveryAssignment> findByOrderId(UUID orderId);

    Optional<DeliveryAssignment> findFirstByDeliveryPartnerIdAndStatusIn(
            UUID deliveryPartnerId,
            Collection<DeliveryAssignmentStatus> statuses
    );
}
