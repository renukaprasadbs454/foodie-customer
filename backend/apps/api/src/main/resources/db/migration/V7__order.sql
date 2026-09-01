-- Module 6: Order
-- Owns: "order", order_item, order_status_event (Phase3 §3.5)
-- Never soft-deleted. coupon_id / delivery_partner_id are UUID columns without FK
-- until Coupon / Delivery modules introduce their tables (no invented stub tables).

CREATE TABLE "order" (
    id                    UUID PRIMARY KEY,
    order_number          VARCHAR(20) NOT NULL UNIQUE,
    customer_id           UUID NOT NULL REFERENCES customer(id),
    restaurant_id         UUID NOT NULL REFERENCES restaurant(id),
    delivery_partner_id   UUID,
    address_id            UUID NOT NULL REFERENCES address(id),
    status                VARCHAR(30) NOT NULL,
    subtotal              DECIMAL(10,2) NOT NULL,
    delivery_fee          DECIMAL(10,2) NOT NULL,
    discount_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount            DECIMAL(10,2) NOT NULL,
    total_amount          DECIMAL(10,2) NOT NULL,
    idempotency_key       VARCHAR(100) NOT NULL UNIQUE,
    coupon_id             UUID,
    placed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_order_status CHECK (status IN (
        'PLACED', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP',
        'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED',
        'REJECTED', 'CANCELLED'
    ))
);

CREATE TABLE order_item (
    id            UUID PRIMARY KEY,
    order_id      UUID NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    menu_item_id  UUID NOT NULL REFERENCES menu_item(id),
    variant_id    UUID REFERENCES variant(id),
    quantity      INT NOT NULL,
    unit_price    DECIMAL(10,2) NOT NULL,
    line_total    DECIMAL(10,2) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_order_item_quantity CHECK (quantity > 0)
);

CREATE TABLE order_status_event (
    id           UUID PRIMARY KEY,
    order_id     UUID NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    from_status  VARCHAR(30),
    to_status    VARCHAR(30) NOT NULL,
    actor_type   VARCHAR(20) NOT NULL,
    actor_id     UUID,
    reason       VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_order_status_event_actor_type
        CHECK (actor_type IN ('CUSTOMER', 'RESTAURANT', 'DELIVERY', 'ADMIN', 'SYSTEM'))
);

CREATE INDEX idx_order_customer ON "order"(customer_id);
CREATE INDEX idx_order_restaurant_status ON "order"(restaurant_id, status);
CREATE INDEX idx_order_status_event_order ON order_status_event(order_id);
CREATE INDEX idx_order_placed_at ON "order"(placed_at);
