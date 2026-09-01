package com.foodie.delivery.repository;

import com.foodie.delivery.entity.DeliveryPricingConfig;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeliveryPricingConfigRepository extends JpaRepository<DeliveryPricingConfig, UUID> {
}
