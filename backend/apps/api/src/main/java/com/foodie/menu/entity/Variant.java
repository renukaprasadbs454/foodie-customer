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
@Table(name = "variant")
@SQLRestriction("\"deleted_at\" IS NULL")
public class Variant extends BaseEntity {

    @Column(name = "menu_item_id", nullable = false, updatable = false)
    private UUID menuItemId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "price_delta", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceDelta;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Variant() {
    }

    public static Variant create(UUID menuItemId, String name, BigDecimal priceDelta) {
        Variant variant = new Variant();
        variant.menuItemId = menuItemId;
        variant.name = name;
        variant.priceDelta = priceDelta;
        return variant;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    public UUID getMenuItemId() {
        return menuItemId;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getPriceDelta() {
        return priceDelta;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }
}
