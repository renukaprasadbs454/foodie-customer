package com.foodie.payment.service.impl;

import com.foodie.payment.repository.PaymentRepository;
import com.foodie.shared.contract.PaymentOrderLookup;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentOrderLookupImpl implements PaymentOrderLookup {

    private final PaymentRepository paymentRepository;

    public PaymentOrderLookupImpl(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> findOrderIdByPaymentId(UUID paymentId) {
        return paymentRepository.findById(paymentId).map(payment -> payment.getOrderId());
    }
}
