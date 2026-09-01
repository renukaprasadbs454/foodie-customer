package com.foodie.delivery.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.DeliveryAssignmentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_assignment")
public class DeliveryAssignment extends BaseEntity {

    @Column(name = "order_id", nullable = false, unique = true, updatable = false)
    private UUID orderId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_partner_id", nullable = false, updatable = false)
    private DeliveryPartner deliveryPartner;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DeliveryAssignmentStatus status;

    @Column(name = "pickup_otp_hash", nullable = false, length = 255)
    private String pickupOtpHash;

    @Column(name = "pickup_verified_at")
    private Instant pickupVerifiedAt;

    @Column(name = "delivery_otp_hash", nullable = false, length = 255)
    private String deliveryOtpHash;

    @Column(name = "delivered_verified_at")
    private Instant deliveredVerifiedAt;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected DeliveryAssignment() {
    }

    public static DeliveryAssignment createOffered(
            UUID orderId,
            DeliveryPartner deliveryPartner,
            String pickupOtpHash,
            String deliveryOtpHash
    ) {
        DeliveryAssignment assignment = new DeliveryAssignment();
        assignment.orderId = orderId;
        assignment.deliveryPartner = deliveryPartner;
        assignment.status = DeliveryAssignmentStatus.OFFERED;
        assignment.pickupOtpHash = pickupOtpHash;
        assignment.deliveryOtpHash = deliveryOtpHash;
        assignment.assignedAt = Instant.now();
        return assignment;
    }

    public void accept() {
        this.status = DeliveryAssignmentStatus.ACCEPTED;
    }

    public void markPickupVerified() {
        this.pickupVerifiedAt = Instant.now();
        this.status = DeliveryAssignmentStatus.PICKED_UP;
    }

    public void markDelivered() {
        this.deliveredVerifiedAt = Instant.now();
        this.status = DeliveryAssignmentStatus.DELIVERED;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public DeliveryPartner getDeliveryPartner() {
        return deliveryPartner;
    }

    public DeliveryAssignmentStatus getStatus() {
        return status;
    }

    public String getPickupOtpHash() {
        return pickupOtpHash;
    }

    public Instant getPickupVerifiedAt() {
        return pickupVerifiedAt;
    }

    public String getDeliveryOtpHash() {
        return deliveryOtpHash;
    }

    public Instant getDeliveredVerifiedAt() {
        return deliveredVerifiedAt;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public Long getVersion() {
        return version;
    }
}
