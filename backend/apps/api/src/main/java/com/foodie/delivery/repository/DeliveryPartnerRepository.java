package com.foodie.delivery.repository;

import com.foodie.delivery.entity.DeliveryPartner;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryPartnerRepository extends JpaRepository<DeliveryPartner, UUID> {

    Optional<DeliveryPartner> findByUserCredentialId(UUID userCredentialId);

    Optional<DeliveryPartner> findByIdAndUserCredentialId(UUID id, UUID userCredentialId);
}
