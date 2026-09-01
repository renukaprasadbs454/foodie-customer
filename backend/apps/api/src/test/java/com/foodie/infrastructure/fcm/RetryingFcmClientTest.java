package com.foodie.infrastructure.fcm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.common.exception.ExternalServiceException;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RetryingFcmClientTest {

    @Test
    void retriesRetryableFailuresThenSucceeds() {
        FcmClient delegate = mock(FcmClient.class);
        when(delegate.sendPush(any(), any(), anyString(), anyString()))
                .thenThrow(new ExternalServiceException("FCM unavailable"))
                .thenReturn(new FcmClient.FcmSendResult(true, "ok"));

        RetryingFcmClient client = new RetryingFcmClient(delegate, 3);
        FcmClient.FcmSendResult result = client.sendPush(UUID.randomUUID(), "t", "title", "body");

        assertThat(result.accepted()).isTrue();
        verify(delegate, times(2)).sendPush(any(), any(), anyString(), anyString());
    }

    @Test
    void doesNotRetryNonRetryable() {
        FcmClient delegate = mock(FcmClient.class);
        when(delegate.sendPush(any(), any(), anyString(), anyString()))
                .thenThrow(new ExternalServiceException("FCM device token missing for user."));

        RetryingFcmClient client = new RetryingFcmClient(delegate, 3);

        assertThatThrownBy(() -> client.sendPush(UUID.randomUUID(), null, "t", "b"))
                .isInstanceOf(ExternalServiceException.class);
        verify(delegate, times(1)).sendPush(any(), any(), anyString(), anyString());
    }
}
