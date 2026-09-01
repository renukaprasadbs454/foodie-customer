package com.foodie.infrastructure.fcm;

import com.foodie.common.exception.ExternalServiceException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Live FCM adapter placeholder. Real HTTP/gRPC wiring requires service-account credentials
 * injected at runtime (never committed). Until credentials are configured, throws retryable
 * unavailable so RetryingFcmClient / callers mark delivery FAILED safely.
 */
public class LiveFcmClient implements FcmClient {

    private static final Logger log = LoggerFactory.getLogger(LiveFcmClient.class);

    private final FcmProperties properties;

    public LiveFcmClient(FcmProperties properties) {
        this.properties = properties;
    }

    @Override
    public FcmSendResult sendPush(UUID userCredentialId, String deviceToken, String title, String body) {
        if (deviceToken == null || deviceToken.isBlank()) {
            throw new ExternalServiceException("FCM device token missing for user.");
        }
        if (properties.getCredentialsPath() == null || properties.getCredentialsPath().isBlank()) {
            log.error("FCM live mode without credentials path — cannot send push");
            throw new ExternalServiceException("FCM unavailable: credentials not configured.");
        }
        // Full Firebase Admin SDK integration is environment-specific; keep boundary here.
        throw new ExternalServiceException("FCM live transport not configured in this environment (5xx unavailable).");
    }
}
