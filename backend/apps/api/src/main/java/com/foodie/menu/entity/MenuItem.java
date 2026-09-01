package com.foodie.menu.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "menu_item")
@SQLRestriction("\"deleted_at\" IS NULL")
public class MenuItem extends BaseEntity {

    @Column(name = "restaurant_id", nullable = false, updatable = false)
    private UUID restaurantId;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "image_s3_key", length = 500)
    private String imageS3Key;

    @Column(name = "is_available", nullable = false)
    private boolean available = true;

    @Column(name = "is_veg", nullable = false)
    private boolean veg;

    @Column(name = "food_type", length = 20)
    private String foodType;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected MenuItem() {
    }

    public static MenuItem create(
            UUID restaurantId,
            UUID categoryId,
            String name,
            String description,
            BigDecimal basePrice,
            boolean veg) {
        return create(restaurantId, categoryId, name, description, basePrice, veg, veg ? "VEG" : "NON_VEG");
    }

    public static MenuItem create(
            UUID restaurantId,
            UUID categoryId,
            String name,
            String description,
            BigDecimal basePrice,
            boolean veg,
            String foodType) {
        MenuItem item = new MenuItem();
        item.restaurantId = restaurantId;
        item.categoryId = categoryId;
        item.name = name;
        item.description = description;
        item.basePrice = basePrice;
        item.veg = veg;
        item.foodType = foodType != null ? foodType : (veg ? "VEG" : "NON_VEG");
        item.available = true;
        return item;
    }

    public void update(
            UUID categoryId,
            String name,
            String description,
            BigDecimal basePrice,
            Boolean veg,
            String foodType) {
        if (categoryId != null)
            this.categoryId = categoryId;
        if (name != null)
            this.name = name;
        this.description = description;
        if (basePrice != null)
            this.basePrice = basePrice;
        if (foodType != null) {
            this.foodType = foodType;
            this.veg = "VEG".equalsIgnoreCase(foodType);
        } else if (veg != null) {
            this.veg = veg;
            this.foodType = veg ? "VEG" : "NON_VEG";
        }
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    public void setImageS3Key(String imageS3Key) {
        this.imageS3Key = imageS3Key;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    public UUID getRestaurantId() {
        return restaurantId;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public String getImageS3Key() {
        return imageS3Key;
    }

    public boolean isAvailable() {
        return available;
    }

    public boolean isVeg() {
        return veg;
    }

    public String getFoodType() {
        return foodType != null ? foodType : (veg ? "VEG" : "NON_VEG");
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }
}
