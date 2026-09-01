package com.foodie.favorite.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "favorite_restaurants")
public class FavoriteRestaurant extends BaseEntity {

    @Column(name = "customer_id", nullable = false, updatable = false)
    private UUID customerId;

    @Column(name = "restaurant_id", nullable = false, updatable = false)
    private UUID restaurantId;

    protected FavoriteRestaurant() {
    }

    public static FavoriteRestaurant create(UUID customerId, UUID restaurantId) {
        FavoriteRestaurant fav = new FavoriteRestaurant();
        fav.customerId = customerId;
        fav.restaurantId = restaurantId;
        return fav;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }
}
