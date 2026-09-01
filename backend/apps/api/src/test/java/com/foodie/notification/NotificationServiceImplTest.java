package com.foodie.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.common.enums.NotificationChannel;
import com.foodie.common.enums.NotificationDeliveryStatus;
import com.foodie.common.enums.NotificationEventType;
import com.foodie.common.exception.ExternalServiceException;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.infrastructure.fcm.FcmClient;
import com.foodie.notification.dto.request.UpdateNotificationPreferenceRequestDto;
import com.foodie.notification.dto.response.NotificationPreferenceResponseDto;
import com.foodie.notification.entity.NotificationLog;
import com.foodie.notification.entity.NotificationTemplate;
import com.foodie.notification.repository.NotificationLogRepository;
import com.foodie.notification.repository.NotificationTemplateRepository;
import com.foodie.notification.service.DeviceTokenStore;
import com.foodie.notification.service.NotificationPreferenceStore;
import com.foodie.notification.service.TemplateRenderer;
import com.foodie.notification.service.impl.NotificationServiceImpl;
import com.foodie.shared.event.NotificationDispatchedEvent;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock private NotificationTemplateRepository templateRepository;
    @Mock private NotificationLogRepository logRepository;
    @Mock private NotificationPreferenceStore preferenceStore;
    @Mock private DeviceTokenStore deviceTokenStore;
    @Mock private FcmClient fcmClient;
    @Mock private ApplicationEventPublisher eventPublisher;

    private NotificationServiceImpl service;
    private final UUID userId = UUID.randomUUID();
    private final UUID templateId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new NotificationServiceImpl(
                templateRepository,
                logRepository,
                new TemplateRenderer(),
                preferenceStore,
                deviceTokenStore,
                fcmClient,
                eventPublisher
        );
    }

    @Test
    void send_rendersTemplate_sendsFcm_marksSent() {
        NotificationTemplate template = template(NotificationEventType.ORDER_CONFIRMED,
                "Order confirmed", "Your order {{orderNumber}} has been confirmed.");
        when(templateRepository.findByEventTypeAndChannel(
                NotificationEventType.ORDER_CONFIRMED, NotificationChannel.PUSH))
                .thenReturn(Optional.of(template));
        when(preferenceStore.isEnabled(userId, NotificationChannel.PUSH)).thenReturn(true);
        when(deviceTokenStore.find(userId)).thenReturn(Optional.of("token-1"));
        when(logRepository.save(any(NotificationLog.class))).thenAnswer(inv -> {
            NotificationLog log = inv.getArgument(0);
            if (log.getId() == null) {
                ReflectionTestUtils.setField(log, "id", UUID.randomUUID());
            }
            return log;
        });
        when(fcmClient.sendPush(eq(userId), eq("token-1"), any(), any()))
                .thenReturn(new FcmClient.FcmSendResult(true, "msg-1"));

        service.send(userId, NotificationEventType.ORDER_CONFIRMED, Map.of("orderNumber", "FD-1"));

        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(logRepository, org.mockito.Mockito.atLeast(2)).save(captor.capture());
        assertThat(captor.getAllValues().getLast().getDeliveryStatus())
                .isEqualTo(NotificationDeliveryStatus.SENT);
        assertThat(captor.getAllValues().getFirst().getTitle()).isEqualTo("Order confirmed");
        assertThat(captor.getAllValues().getFirst().getBody())
                .isEqualTo("Your order FD-1 has been confirmed.");
        verify(eventPublisher).publishEvent(any(NotificationDispatchedEvent.class));
    }

    @Test
    void send_fcmFailure_marksFailed_doesNotThrow() {
        NotificationTemplate template = template(NotificationEventType.PAYMENT_FAILED,
                "Payment failed", "Payment failed for {{orderNumber}}");
        when(templateRepository.findByEventTypeAndChannel(
                NotificationEventType.PAYMENT_FAILED, NotificationChannel.PUSH))
                .thenReturn(Optional.of(template));
        when(preferenceStore.isEnabled(userId, NotificationChannel.PUSH)).thenReturn(true);
        when(deviceTokenStore.find(userId)).thenReturn(Optional.empty());
        when(logRepository.save(any(NotificationLog.class))).thenAnswer(inv -> {
            NotificationLog log = inv.getArgument(0);
            ReflectionTestUtils.setField(log, "id", UUID.randomUUID());
            return log;
        });
        when(fcmClient.sendPush(any(), any(), any(), any()))
                .thenThrow(new ExternalServiceException("FCM unavailable"));

        service.send(userId, NotificationEventType.PAYMENT_FAILED, Map.of("orderNumber", "FD-2"));

        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(logRepository, org.mockito.Mockito.atLeast(2)).save(captor.capture());
        assertThat(captor.getAllValues().getLast().getDeliveryStatus())
                .isEqualTo(NotificationDeliveryStatus.FAILED);
    }

    @Test
    void send_preferenceDisabled_skipsFcm() {
        NotificationTemplate template = template(NotificationEventType.ORDER_DELIVERED,
                "Delivered", "Done {{orderNumber}}");
        when(templateRepository.findByEventTypeAndChannel(
                NotificationEventType.ORDER_DELIVERED, NotificationChannel.PUSH))
                .thenReturn(Optional.of(template));
        when(preferenceStore.isEnabled(userId, NotificationChannel.PUSH)).thenReturn(false);
        when(logRepository.save(any(NotificationLog.class))).thenAnswer(inv -> {
            NotificationLog log = inv.getArgument(0);
            ReflectionTestUtils.setField(log, "id", UUID.randomUUID());
            return log;
        });

        service.send(userId, NotificationEventType.ORDER_DELIVERED, Map.of("orderNumber", "FD-3"));

        verify(fcmClient, never()).sendPush(any(), any(), any(), any());
        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(logRepository).save(captor.capture());
        assertThat(captor.getValue().getDeliveryStatus()).isEqualTo(NotificationDeliveryStatus.SKIPPED);
    }

    @Test
    void markRead_wrongOwner_throws404() {
        UUID logId = UUID.randomUUID();
        when(logRepository.findByIdAndUserCredentialId(logId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markRead(userId, logId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void list_unreadOnly() {
        NotificationLog entry = NotificationLog.create(
                userId, templateId, "t", "b", NotificationDeliveryStatus.SENT);
        ReflectionTestUtils.setField(entry, "id", UUID.randomUUID());
        when(logRepository.findByUserCredentialIdAndReadAtIsNull(eq(userId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entry)));

        var page = service.list(userId, true, 0, 20);

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().getFirst().title()).isEqualTo("t");
    }

    @Test
    void updatePreferences_delegatesToStore() {
        when(preferenceStore.save(userId, false, true))
                .thenReturn(new NotificationPreferenceResponseDto(false, true));

        var result = service.updatePreferences(
                userId, new UpdateNotificationPreferenceRequestDto(false, true));

        assertThat(result.pushEnabled()).isFalse();
        assertThat(result.smsEnabled()).isTrue();
    }

    private NotificationTemplate template(NotificationEventType type, String title, String body) {
        NotificationTemplate template = mock(NotificationTemplate.class);
        when(template.getId()).thenReturn(templateId);
        when(template.getTitleTemplate()).thenReturn(title);
        when(template.getBodyTemplate()).thenReturn(body);
        return template;
    }
}
