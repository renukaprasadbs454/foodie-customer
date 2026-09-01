package com.foodie.user.service.impl;

import com.foodie.shared.contract.CustomerAnalyticsQuery;
import com.foodie.user.repository.CustomerAnalyticsProjectionRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerAnalyticsQueryImpl implements CustomerAnalyticsQuery {

    private final CustomerAnalyticsProjectionRepository repository;

    public CustomerAnalyticsQueryImpl(CustomerAnalyticsProjectionRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public long countCreatedBetween(Instant fromInclusive, Instant toExclusive) {
        return repository.countCreatedBetween(fromInclusive, toExclusive);
    }
}
