package com.foodie.infrastructure.fcm;

import com.foodie.common.exception.ExternalServiceException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Retries outbound FCM calls with exponential backoff (max 3) for retryable failures. */
public class RetryingFcmClient implements FcmClient {

    private static final Logger log = LoggerFactory.getLogger(RetryingFcmClient.class);

    private final FcmClient delegate;
    private final int maxAttempts;

    public RetryingFcmClient(FcmClient delegate, int maxAttempts) {
        this.delegate = delegate;
        this.maxAttempts = Math.max(1, maxAttempts);
    }

    @Override
    public FcmSendResult sendPush(UUID userCredentialId, String deviceToken, String title, String body) {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return delegate.sendPush(userCredentialId, deviceToken, title, body);
            } catch (ExternalServiceException ex) {
                last = ex;
                if (attempt == maxAttempts || !isRetryable(ex)) {
                    throw ex;
                }
                log.warn("FCM send attempt {} failed (retryable): {}", attempt, ex.getMessage());
                sleepBackoff(attempt);
            } catch (RuntimeException ex) {
                last = ex;
                if (attempt == maxAttempts) {
                    throw new ExternalServiceException("FCM request failed.");
                }
                log.warn("FCM send attempt {} failed: {}", attempt, ex.getMessage());
                sleepBackoff(attempt);
            }
        }
        throw last != null ? last : new ExternalServiceException("FCM request failed.");
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
            throw new ExternalServiceException("FCM request interrupted.");
        }
    }
}
