package com.foodie.notification.repository;

import com.foodie.notification.entity.NotificationLog;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, UUID> {

    Page<NotificationLog> findByUserCredentialId(UUID userCredentialId, Pageable pageable);

    Page<NotificationLog> findByUserCredentialIdAndReadAtIsNull(UUID userCredentialId, Pageable pageable);

    Optional<NotificationLog> findByIdAndUserCredentialId(UUID id, UUID userCredentialId);
}
