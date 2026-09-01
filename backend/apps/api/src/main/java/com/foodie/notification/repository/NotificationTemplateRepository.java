package com.foodie.notification.repository;

import com.foodie.common.enums.NotificationChannel;
import com.foodie.common.enums.NotificationEventType;
import com.foodie.notification.entity.NotificationTemplate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, UUID> {

    Optional<NotificationTemplate> findByEventTypeAndChannel(
            NotificationEventType eventType, NotificationChannel channel);
}
