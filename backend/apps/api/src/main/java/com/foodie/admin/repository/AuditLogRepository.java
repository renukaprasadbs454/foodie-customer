package com.foodie.admin.repository;

import com.foodie.admin.entity.AuditLog;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query("""
            SELECT a FROM AuditLog a
            WHERE (:resourceType IS NULL OR a.resourceType = :resourceType)
              AND (:resourceId IS NULL OR a.resourceId = :resourceId)
              AND (:adminUserId IS NULL OR a.adminUserId = :adminUserId)
              AND (:from IS NULL OR a.createdAt >= :from)
              AND (:to IS NULL OR a.createdAt <= :to)
            """)
    Page<AuditLog> search(
            @Param("resourceType") String resourceType,
            @Param("resourceId") UUID resourceId,
            @Param("adminUserId") UUID adminUserId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );
}
