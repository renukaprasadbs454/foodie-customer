package com.foodie.review.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "review")
public class Review extends BaseEntity {

    @Column(name = "order_id", nullable = false, unique = true, updatable = false)
    private UUID orderId;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private UUID customerId;

    @Column(name = "restaurant_id", nullable = false, updatable = false)
    private UUID restaurantId;

    @Column(name = "delivery_partner_id", updatable = false)
    private UUID deliveryPartnerId;

    @Column(name = "restaurant_rating", nullable = false)
    private short restaurantRating;

    @Column(name = "delivery_rating")
    private Short deliveryRating;

    @Column(name = "comment", length = 1000)
    private String comment;

    protected Review() {
    }

    public static Review submit(
            UUID orderId,
            UUID customerId,
            UUID restaurantId,
            UUID deliveryPartnerId,
            int restaurantRating,
            Integer deliveryRating,
            String comment
    ) {
        Review review = new Review();
        review.orderId = orderId;
        review.customerId = customerId;
        review.restaurantId = restaurantId;
        review.deliveryPartnerId = deliveryPartnerId;
        review.restaurantRating = (short) restaurantRating;
        review.deliveryRating = deliveryRating == null ? null : deliveryRating.shortValue();
        review.comment = comment;
        return review;
    }

    public UUID getOrderId() {
        return orderId;
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

    public short getRestaurantRating() {
        return restaurantRating;
    }

    public Short getDeliveryRating() {
        return deliveryRating;
    }

    public String getComment() {
        return comment;
    }
}
