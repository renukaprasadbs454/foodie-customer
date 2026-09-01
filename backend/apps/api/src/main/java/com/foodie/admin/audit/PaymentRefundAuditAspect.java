package com.foodie.admin.audit;

import com.foodie.admin.entity.AdminUser;
import com.foodie.admin.repository.AdminUserRepository;
import com.foodie.admin.service.AdminService;
import com.foodie.payment.dto.request.RefundPaymentRequestDto;
import com.foodie.payment.dto.response.RefundInitiationResponseDto;
import java.util.Map;
import java.util.UUID;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Payment refunds always write audit_log (API Contracts MODULE 7.3 / Admin ownership of audit).
 * System-initiated refunds attribute to the seeded SYSTEM admin_user.
 */
@Aspect
@Component
public class PaymentRefundAuditAspect {

    private static final UUID SYSTEM_ADMIN_USER_ID = UUID.fromString("44444444-4444-4444-4444-444444444002");

    private static final Logger log = LoggerFactory.getLogger(PaymentRefundAuditAspect.class);

    private final AdminService adminService;
    private final AdminUserRepository adminUserRepository;

    public PaymentRefundAuditAspect(AdminService adminService, AdminUserRepository adminUserRepository) {
        this.adminService = adminService;
        this.adminUserRepository = adminUserRepository;
    }

    @AfterReturning(
            pointcut = "execution(* com.foodie.payment.service.PaymentService.refund(..)) && args(paymentId, request, actorId, systemActor)",
            returning = "result",
            argNames = "paymentId,request,actorId,systemActor,result"
    )
    public void afterRefund(
            UUID paymentId,
            RefundPaymentRequestDto request,
            UUID actorId,
            boolean systemActor,
            RefundInitiationResponseDto result
    ) {
        try {
            UUID adminUserId = resolveAdminUserId(actorId, systemActor);
            adminService.recordAudit(
                    adminUserId,
                    "REFUND_PAYMENT",
                    "PAYMENT",
                    paymentId,
                    null,
                    Map.of(
                            "refundRequestId", result.refundRequestId(),
                            "status", result.status().name(),
                            "amount", request.amount(),
                            "reason", request.reason(),
                            "systemActor", systemActor
                    )
            );
        } catch (RuntimeException ex) {
            log.error("Failed to audit payment refund for paymentId={}: {}", paymentId, ex.getMessage());
        }
    }

    private UUID resolveAdminUserId(UUID actorCredentialId, boolean systemActor) {
        if (systemActor) {
            return SYSTEM_ADMIN_USER_ID;
        }
        return adminUserRepository.findByUserCredentialId(actorCredentialId)
                .map(AdminUser::getId)
                .orElse(SYSTEM_ADMIN_USER_ID);
    }
}
