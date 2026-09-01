package com.foodie.infrastructure.fcm;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class StubFcmClient implements FcmClient {

    private static final Logger log = LoggerFactory.getLogger(StubFcmClient.class);

    @Override
    public FcmSendResult sendPush(UUID userCredentialId, String deviceToken, String title, String body) {
        String messageId = "stub-fcm-" + UUID.randomUUID();
        log.info(
                "Stub FCM push user={} tokenPresent={} title={} body={} messageId={}",
                userCredentialId,
                deviceToken != null && !deviceToken.isBlank(),
                title,
                body,
                messageId
        );
        return new FcmSendResult(true, messageId);
    }
}
