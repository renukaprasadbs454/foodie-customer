package com.foodie.order.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "order_item")
public class OrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, updatable = false)
    private Order order;

    @Column(name = "menu_item_id", nullable = false, updatable = false)
    private UUID menuItemId;

    @Column(name = "variant_id", updatable = false)
    private UUID variantId;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal lineTotal;

    protected OrderItem() {
    }

    public static OrderItem snapshot(
            Order order,
            UUID menuItemId,
            UUID variantId,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal
    ) {
        OrderItem item = new OrderItem();
        item.order = order;
        item.menuItemId = menuItemId;
        item.variantId = variantId;
        item.quantity = quantity;
        item.unitPrice = unitPrice;
        item.lineTotal = lineTotal;
        return item;
    }

    public Order getOrder() {
        return order;
    }

    public UUID getMenuItemId() {
        return menuItemId;
    }

    public UUID getVariantId() {
        return variantId;
    }

    public int getQuantity() {
        return quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public BigDecimal getLineTotal() {
        return lineTotal;
    }
}
