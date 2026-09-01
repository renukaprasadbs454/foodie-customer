package com.foodie.payment.service.impl;

import com.foodie.payment.repository.PaymentAnalyticsProjectionRepository;
import com.foodie.shared.contract.PaymentAnalyticsQuery;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentAnalyticsQueryImpl implements PaymentAnalyticsQuery {

    private final PaymentAnalyticsProjectionRepository repository;

    public PaymentAnalyticsQueryImpl(PaymentAnalyticsProjectionRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal sumCapturedBetween(Instant fromInclusive, Instant toExclusive) {
        BigDecimal sum = repository.sumCapturedBetween(fromInclusive, toExclusive);
        return sum == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : sum.setScale(2, RoundingMode.HALF_UP);
    }
}
