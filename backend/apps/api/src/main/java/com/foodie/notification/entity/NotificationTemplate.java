package com.foodie.notification.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.NotificationChannel;
import com.foodie.common.enums.NotificationEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "notification_template")
public class NotificationTemplate extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50, updatable = false)
    private NotificationEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 10, updatable = false)
    private NotificationChannel channel;

    @Column(name = "title_template", nullable = false, length = 255)
    private String titleTemplate;

    @Column(name = "body_template", nullable = false, length = 500)
    private String bodyTemplate;

    protected NotificationTemplate() {
    }

    public NotificationEventType getEventType() {
        return eventType;
    }

    public NotificationChannel getChannel() {
        return channel;
    }

    public String getTitleTemplate() {
        return titleTemplate;
    }

    public String getBodyTemplate() {
        return bodyTemplate;
    }
}
