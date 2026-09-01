package com.foodie.infrastructure.razorpay;

import com.foodie.common.exception.ExternalServiceException;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Retries outbound Razorpay calls with exponential backoff (max 3) for retryable failures (Phase3 §8.7).
 */
public class RetryingRazorpayClient implements RazorpayClient {

    private static final Logger log = LoggerFactory.getLogger(RetryingRazorpayClient.class);
    private static final int MAX_ATTEMPTS = 3;

    private final RazorpayClient delegate;

    public RetryingRazorpayClient(RazorpayClient delegate) {
        this.delegate = delegate;
    }

    @Override
    public RazorpayOrderCreateResult createOrder(BigDecimal amountInr, String receipt, String notesOrderId) {
        return execute("createOrder", () -> delegate.createOrder(amountInr, receipt, notesOrderId));
    }

    @Override
    public RazorpayRefundResult createRefund(String razorpayPaymentId, BigDecimal amountInr, String reason) {
        return execute("createRefund", () -> delegate.createRefund(razorpayPaymentId, amountInr, reason));
    }

    private <T> T execute(String op, Call<T> call) {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return call.run();
            } catch (ExternalServiceException ex) {
                last = ex;
                if (attempt == MAX_ATTEMPTS || !isRetryable(ex)) {
                    throw ex;
                }
                log.warn("Razorpay {} attempt {} failed (retryable): {}", op, attempt, ex.getMessage());
                sleepBackoff(attempt);
            } catch (RuntimeException ex) {
                last = ex;
                if (attempt == MAX_ATTEMPTS) {
                    throw new ExternalServiceException("Razorpay request failed.");
                }
                log.warn("Razorpay {} attempt {} failed: {}", op, attempt, ex.getMessage());
                sleepBackoff(attempt);
            }
        }
        throw last != null ? last : new ExternalServiceException("Razorpay request failed.");
    }

    private static boolean isRetryable(ExternalServiceException ex) {
        String msg = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase();
        return msg.contains("timeout") || msg.contains("5xx") || msg.contains("unavailable");
    }

    private static void sleepBackoff(int attempt) {
        try {
            Thread.sleep(100L * (1L << (attempt - 1)));
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new ExternalServiceException("Razorpay request interrupted.");
        }
    }

    @FunctionalInterface
    private interface Call<T> {
        T run();
    }
}
