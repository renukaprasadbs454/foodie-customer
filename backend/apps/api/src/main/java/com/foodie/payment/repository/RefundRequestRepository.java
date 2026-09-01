package com.foodie.payment.repository;

import com.foodie.common.enums.RefundStatus;
import com.foodie.payment.entity.RefundRequest;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, UUID> {

    Optional<RefundRequest> findByRazorpayRefundId(String razorpayRefundId);

    List<RefundRequest> findByPaymentIdAndStatus(UUID paymentId, RefundStatus status);
}
