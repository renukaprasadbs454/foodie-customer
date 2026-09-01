package com.foodie.payment.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.PaymentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment")
public class Payment extends BaseEntity {

    @Column(name = "order_id", nullable = false, unique = true, updatable = false)
    private UUID orderId;

    @Column(name = "razorpay_order_id", length = 100)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", length = 100)
    private String razorpayPaymentId;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "wallet_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal walletAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentStatus status;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "captured_at")
    private Instant capturedAt;

    protected Payment() {
    }

    public static Payment initiate(
            UUID orderId,
            String razorpayOrderId,
            BigDecimal amount,
            BigDecimal walletAmount,
            String idempotencyKey) {
        Payment payment = new Payment();
        payment.orderId = orderId;
        payment.razorpayOrderId = razorpayOrderId;
        payment.amount = amount;
        payment.walletAmount = walletAmount != null ? walletAmount : BigDecimal.ZERO;
        payment.status = amount.compareTo(BigDecimal.ZERO) == 0 && payment.walletAmount.compareTo(BigDecimal.ZERO) > 0
                ? PaymentStatus.CAPTURED
                : PaymentStatus.PENDING;
        if (payment.status == PaymentStatus.CAPTURED) {
            payment.capturedAt = Instant.now();
        }
        payment.idempotencyKey = idempotencyKey;
        return payment;
    }

    public void markCaptured(String razorpayPaymentId) {
        this.status = PaymentStatus.CAPTURED;
        this.razorpayPaymentId = razorpayPaymentId;
        this.capturedAt = Instant.now();
    }

    public void markFailed(String razorpayPaymentId) {
        this.status = PaymentStatus.FAILED;
        if (razorpayPaymentId != null) {
            this.razorpayPaymentId = razorpayPaymentId;
        }
    }

    public void markRefunded() {
        this.status = PaymentStatus.REFUNDED;
    }

    /**
     * Re-open a FAILED payment for a new Razorpay intent (unique order_id
     * constraint).
     */
    public void reinitiate(String razorpayOrderId, String idempotencyKey, BigDecimal amount, BigDecimal walletAmount) {
        this.razorpayOrderId = razorpayOrderId;
        this.idempotencyKey = idempotencyKey;
        this.amount = amount;
        this.walletAmount = walletAmount != null ? walletAmount : BigDecimal.ZERO;
        this.status = amount.compareTo(BigDecimal.ZERO) == 0 && this.walletAmount.compareTo(BigDecimal.ZERO) > 0
                ? PaymentStatus.CAPTURED
                : PaymentStatus.PENDING;
        this.razorpayPaymentId = this.status == PaymentStatus.CAPTURED ? "WALLET_" + orderId : null;
        this.capturedAt = this.status == PaymentStatus.CAPTURED ? Instant.now() : null;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public BigDecimal getWalletAmount() {
        return walletAmount;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public Instant getCapturedAt() {
        return capturedAt;
    }
}
