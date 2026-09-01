package com.foodie.delivery.service.impl;

import com.foodie.delivery.repository.DeliveryAnalyticsProjectionRepository;
import com.foodie.shared.contract.DeliveryAnalyticsQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeliveryAnalyticsQueryImpl implements DeliveryAnalyticsQuery {

    private final DeliveryAnalyticsProjectionRepository repository;

    public DeliveryAnalyticsQueryImpl(DeliveryAnalyticsProjectionRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public long countKycVerified() {
        return repository.countKycVerified();
    }
}
