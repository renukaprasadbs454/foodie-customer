package com.foodie.cart.entity;

import com.foodie.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "cart_item")
public class CartItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cart_id", nullable = false, updatable = false)
    private Cart cart;

    @Column(name = "menu_item_id", nullable = false, updatable = false)
    private UUID menuItemId;

    @Column(name = "variant_id", updatable = false)
    private UUID variantId;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "notes", length = 500)
    private String notes;

    protected CartItem() {
    }

    public static CartItem create(Cart cart, UUID menuItemId, UUID variantId, int quantity, String notes) {
        CartItem item = new CartItem();
        item.cart = cart;
        item.menuItemId = menuItemId;
        item.variantId = variantId;
        item.quantity = quantity;
        item.notes = notes;
        return item;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Cart getCart() {
        return cart;
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

    public String getNotes() {
        return notes;
    }
}
