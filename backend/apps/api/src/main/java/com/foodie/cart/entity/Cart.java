package com.foodie.cart.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "cart")
public class Cart extends BaseEntity {

    @Column(name = "customer_id", nullable = false, unique = true, updatable = false)
    private UUID customerId;

    @Column(name = "restaurant_id")
    private UUID restaurantId;

    protected Cart() {
    }

    public static Cart createEmpty(UUID customerId) {
        Cart cart = new Cart();
        cart.customerId = customerId;
        return cart;
    }

    public void setRestaurantId(UUID restaurantId) {
        this.restaurantId = restaurantId;
    }

    public void clearRestaurant() {
        this.restaurantId = null;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }
}
