package com.foodie.infrastructure.razorpay;

import java.math.BigDecimal;

/**
 * Outbound Razorpay gateway port (Phase3 §2.7 / §8). Payment module only consumer.
 */
public interface RazorpayClient {

    RazorpayOrderCreateResult createOrder(BigDecimal amountInr, String receipt, String notesOrderId);

    RazorpayRefundResult createRefund(String razorpayPaymentId, BigDecimal amountInr, String reason);

    record RazorpayOrderCreateResult(String razorpayOrderId, BigDecimal amountInr, String currency) {
    }

    record RazorpayRefundResult(String razorpayRefundId) {
    }
}
