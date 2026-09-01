package com.foodie.shared.contract;

/**
 * Delivery-owned read projections for Analytics (Phase3 §2.14).
 */
public interface DeliveryAnalyticsQuery {

    long countKycVerified();
}
