package com.foodie.order.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.OrderStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order")
public class Order extends BaseEntity {

    @Column(name = "order_number", nullable = false, unique = true, length = 20)
    private String orderNumber;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private UUID customerId;

    @Column(name = "restaurant_id", nullable = false, updatable = false)
    private UUID restaurantId;

    @Column(name = "delivery_partner_id")
    private UUID deliveryPartnerId;

    @Column(name = "address_id", nullable = false, updatable = false)
    private UUID addressId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OrderStatus status;

    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "delivery_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal deliveryFee;

    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "tax_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "coupon_id")
    private UUID couponId;

    @Column(name = "placed_at", nullable = false, updatable = false)
    private Instant placedAt;

    protected Order() {
    }

    public static Order place(
            String orderNumber,
            UUID customerId,
            UUID restaurantId,
            UUID addressId,
            BigDecimal subtotal,
            BigDecimal deliveryFee,
            BigDecimal discountAmount,
            BigDecimal taxAmount,
            BigDecimal totalAmount,
            String idempotencyKey
    ) {
        Order order = new Order();
        order.orderNumber = orderNumber;
        order.customerId = customerId;
        order.restaurantId = restaurantId;
        order.addressId = addressId;
        order.status = OrderStatus.PLACED;
        order.subtotal = subtotal;
        order.deliveryFee = deliveryFee;
        order.discountAmount = discountAmount;
        order.taxAmount = taxAmount;
        order.totalAmount = totalAmount;
        order.idempotencyKey = idempotencyKey;
        order.placedAt = Instant.now();
        return order;
    }

    /** Attaches a server-validated coupon after {@link #place}; discount is already in totals. */
    public void attachCoupon(UUID couponId) {
        this.couponId = couponId;
    }

    public void transitionTo(OrderStatus status) {
        this.status = status;
    }

    public void assignDeliveryPartner(UUID deliveryPartnerId) {
        this.deliveryPartnerId = deliveryPartnerId;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }

    public UUID getDeliveryPartnerId() {
        return deliveryPartnerId;
    }

    public UUID getAddressId() {
        return addressId;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public BigDecimal getDeliveryFee() {
        return deliveryFee;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public UUID getCouponId() {
        return couponId;
    }

    public Instant getPlacedAt() {
        return placedAt;
    }
}
