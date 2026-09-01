-- Module 5: Cart
-- Owns: cart, cart_item (Phase3 §3.5)
-- Ephemeral; cart_item hard-deleted (no deleted_at)

CREATE TABLE cart (
    id             UUID PRIMARY KEY,
    customer_id    UUID NOT NULL UNIQUE REFERENCES customer(id) ON DELETE CASCADE,
    restaurant_id  UUID REFERENCES restaurant(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE cart_item (
    id            UUID PRIMARY KEY,
    cart_id       UUID NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
    menu_item_id  UUID NOT NULL REFERENCES menu_item(id),
    variant_id    UUID REFERENCES variant(id),
    quantity      INT NOT NULL,
    notes         VARCHAR(500),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_cart_item_quantity CHECK (quantity > 0)
);

CREATE UNIQUE INDEX uq_cart_item_line
    ON cart_item (cart_id, menu_item_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'));

CREATE INDEX idx_cart_item_cart ON cart_item(cart_id);
