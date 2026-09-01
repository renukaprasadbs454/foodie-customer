package com.foodie.delivery.repository;

import com.foodie.delivery.entity.DeliveryPartner;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * Read-only analytics projections owned by Delivery (Phase3 §2.14).
 */
public interface DeliveryAnalyticsProjectionRepository extends JpaRepository<DeliveryPartner, UUID> {

    @Query("""
            select count(p) from DeliveryPartner p
            where p.kycStatus = com.foodie.common.enums.KycStatus.VERIFIED
            """)
    long countKycVerified();
}
