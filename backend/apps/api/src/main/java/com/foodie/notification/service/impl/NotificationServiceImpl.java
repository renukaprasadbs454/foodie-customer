package com.foodie.notification.service.impl;

import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.NotificationChannel;
import com.foodie.common.enums.NotificationDeliveryStatus;
import com.foodie.common.enums.NotificationEventType;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.infrastructure.fcm.FcmClient;
import com.foodie.notification.dto.request.UpdateNotificationPreferenceRequestDto;
import com.foodie.notification.dto.response.NotificationPreferenceResponseDto;
import com.foodie.notification.dto.response.NotificationReadResponseDto;
import com.foodie.notification.dto.response.NotificationResponseDto;
import com.foodie.notification.entity.NotificationLog;
import com.foodie.notification.entity.NotificationTemplate;
import com.foodie.notification.mapper.NotificationMapper;
import com.foodie.notification.repository.NotificationLogRepository;
import com.foodie.notification.repository.NotificationTemplateRepository;
import com.foodie.notification.service.DeviceTokenStore;
import com.foodie.notification.service.NotificationPreferenceStore;
import com.foodie.notification.service.NotificationService;
import com.foodie.notification.service.TemplateRenderer;
import com.foodie.shared.event.NotificationDispatchedEvent;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationTemplateRepository templateRepository;
    private final NotificationLogRepository logRepository;
    private final TemplateRenderer templateRenderer;
    private final NotificationPreferenceStore preferenceStore;
    private final DeviceTokenStore deviceTokenStore;
    private final FcmClient fcmClient;
    private final ApplicationEventPublisher eventPublisher;

    public NotificationServiceImpl(
            NotificationTemplateRepository templateRepository,
            NotificationLogRepository logRepository,
            TemplateRenderer templateRenderer,
            NotificationPreferenceStore preferenceStore,
            DeviceTokenStore deviceTokenStore,
            FcmClient fcmClient,
            ApplicationEventPublisher eventPublisher
    ) {
        this.templateRepository = templateRepository;
        this.logRepository = logRepository;
        this.templateRenderer = templateRenderer;
        this.preferenceStore = preferenceStore;
        this.deviceTokenStore = deviceTokenStore;
        this.fcmClient = fcmClient;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional
    public void send(UUID userCredentialId, NotificationEventType eventType, Map<String, String> params) {
        if (userCredentialId == null || eventType == null) {
            return;
        }

        NotificationTemplate template = templateRepository
                .findByEventTypeAndChannel(eventType, NotificationChannel.PUSH)
                .orElse(null);
        if (template == null) {
            log.warn("No PUSH template for eventType={} — skipping", eventType);
            return;
        }

        String title = templateRenderer.render(template.getTitleTemplate(), params);
        String body = templateRenderer.render(template.getBodyTemplate(), params);

        if (!preferenceStore.isEnabled(userCredentialId, NotificationChannel.PUSH)) {
            NotificationLog skipped = logRepository.save(NotificationLog.create(
                    userCredentialId,
                    template.getId(),
                    title,
                    body,
                    NotificationDeliveryStatus.SKIPPED
            ));
            publishDispatched(skipped);
            return;
        }

        NotificationLog entry = logRepository.save(NotificationLog.create(
                userCredentialId,
                template.getId(),
                title,
                body,
                NotificationDeliveryStatus.PENDING
        ));

        try {
            String token = deviceTokenStore.find(userCredentialId).orElse(null);
            fcmClient.sendPush(userCredentialId, token, title, body);
            entry.markDeliveryStatus(NotificationDeliveryStatus.SENT);
        } catch (RuntimeException ex) {
            // Must never fail the originating business transaction (listener is AFTER_COMMIT).
            log.error("FCM delivery failed for user={} eventType={}: {}",
                    userCredentialId, eventType, ex.getMessage());
            entry.markDeliveryStatus(NotificationDeliveryStatus.FAILED);
        }
        logRepository.save(entry);
        publishDispatched(entry);
        // SMS/EMAIL: infrastructure abstractions exist; Phase3 §2.10 V1 may call FCM exclusively.
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<NotificationResponseDto> list(
            UUID userCredentialId, boolean unreadOnly, int page, int size) {
        var pageable = PageRequest.of(
                Math.max(page, 0),
                clampSize(size),
                Sort.by(Sort.Direction.DESC, "sentAt")
        );
        Page<NotificationLog> result = unreadOnly
                ? logRepository.findByUserCredentialIdAndReadAtIsNull(userCredentialId, pageable)
                : logRepository.findByUserCredentialId(userCredentialId, pageable);
        List<NotificationResponseDto> items = result.getContent().stream()
                .map(NotificationMapper::toResponse)
                .toList();
        return new PageResult<>(items, new PaginationMeta(
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages()));
    }

    @Override
    @Transactional
    public NotificationReadResponseDto markRead(UUID userCredentialId, UUID notificationLogId) {
        NotificationLog entry = logRepository.findByIdAndUserCredentialId(notificationLogId, userCredentialId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found."));
        entry.markRead();
        return NotificationMapper.toReadResponse(entry);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationPreferenceResponseDto getPreferences(UUID userCredentialId) {
        return preferenceStore.get(userCredentialId);
    }

    @Override
    public NotificationPreferenceResponseDto updatePreferences(
            UUID userCredentialId, UpdateNotificationPreferenceRequestDto request) {
        return preferenceStore.save(userCredentialId, request.pushEnabled(), request.smsEnabled());
    }

    @Override
    public void registerDeviceToken(UUID userCredentialId, String deviceToken) {
        deviceTokenStore.save(userCredentialId, deviceToken);
    }

    private void publishDispatched(NotificationLog entry) {
        eventPublisher.publishEvent(NotificationDispatchedEvent.of(
                entry.getUserCredentialId(),
                entry.getId(),
                entry.getTitle(),
                entry.getBody(),
                entry.getSentAt()
        ));
    }

    private static int clampSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, 100);
    }
}
