package com.foodie.infrastructure.razorpay;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Local/dev Razorpay adapter — no external calls. Selected when foodie.razorpay.mode=stub.
 */
public class StubRazorpayClient implements RazorpayClient {

    private static final Logger log = LoggerFactory.getLogger(StubRazorpayClient.class);

    @Override
    public RazorpayOrderCreateResult createOrder(BigDecimal amountInr, String receipt, String notesOrderId) {
        String id = "order_stub_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        log.info("Stub Razorpay order created receipt={} notesOrderId={}", receipt, notesOrderId);
        return new RazorpayOrderCreateResult(id, amountInr.setScale(2, RoundingMode.HALF_UP), "INR");
    }

    @Override
    public RazorpayRefundResult createRefund(String razorpayPaymentId, BigDecimal amountInr, String reason) {
        String id = "rfnd_stub_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        log.info("Stub Razorpay refund created paymentId={} amount={}", razorpayPaymentId, amountInr);
        return new RazorpayRefundResult(id);
    }
}
