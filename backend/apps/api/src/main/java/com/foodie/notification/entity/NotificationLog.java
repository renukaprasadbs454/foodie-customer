package com.foodie.notification.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.NotificationDeliveryStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_log")
public class NotificationLog extends BaseEntity {

    @Column(name = "user_credential_id", nullable = false, updatable = false)
    private UUID userCredentialId;

    @Column(name = "template_id", nullable = false, updatable = false)
    private UUID templateId;

    @Column(name = "title", nullable = false, length = 255, updatable = false)
    private String title;

    @Column(name = "body", nullable = false, length = 500, updatable = false)
    private String body;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private Instant sentAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status", nullable = false, length = 20)
    private NotificationDeliveryStatus deliveryStatus;

    @Column(name = "read_at")
    private Instant readAt;

    protected NotificationLog() {
    }

    public static NotificationLog create(
            UUID userCredentialId,
            UUID templateId,
            String title,
            String body,
            NotificationDeliveryStatus status
    ) {
        NotificationLog log = new NotificationLog();
        log.userCredentialId = userCredentialId;
        log.templateId = templateId;
        log.title = title;
        log.body = body;
        log.sentAt = Instant.now();
        log.deliveryStatus = status;
        return log;
    }

    public void markDeliveryStatus(NotificationDeliveryStatus status) {
        this.deliveryStatus = status;
    }

    public void markRead() {
        if (this.readAt == null) {
            this.readAt = Instant.now();
        }
    }

    public UUID getUserCredentialId() {
        return userCredentialId;
    }

    public UUID getTemplateId() {
        return templateId;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public NotificationDeliveryStatus getDeliveryStatus() {
        return deliveryStatus;
    }

    public Instant getReadAt() {
        return readAt;
    }
}
