package com.foodie.menu.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "category")
@SQLRestriction("\"deleted_at\" IS NULL")
public class Category extends BaseEntity {

    @Column(name = "restaurant_id", nullable = false, updatable = false)
    private UUID restaurantId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Category() {
    }

    public static Category create(UUID restaurantId, String name, int displayOrder) {
        Category category = new Category();
        category.restaurantId = restaurantId;
        category.name = name;
        category.displayOrder = displayOrder;
        return category;
    }

    public void update(String name, Integer displayOrder) {
        if (name != null && !name.isBlank()) {
            this.name = name;
        }
        if (displayOrder != null) {
            this.displayOrder = displayOrder;
        }
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }

    public String getName() {
        return name;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }
}
