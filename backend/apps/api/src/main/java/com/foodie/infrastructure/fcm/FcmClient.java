package com.foodie.infrastructure.fcm;

import java.util.UUID;

public interface FcmClient {

    FcmSendResult sendPush(UUID userCredentialId, String deviceToken, String title, String body);

    record FcmSendResult(boolean accepted, String providerMessageId) {
    }
}
