-- Module 11: Review
-- Owns: review (Phase3 §3.8)
-- Never soft-deleted. No moderation columns in Phase3 (flags are Redis-backed in Module 11).
-- One review per order (UNIQUE order_id). restaurant.avg_rating is Restaurant-owned (event-driven).

CREATE TABLE review (
    id                     UUID PRIMARY KEY,
    order_id               UUID NOT NULL UNIQUE REFERENCES "order"(id),
    customer_id            UUID NOT NULL REFERENCES customer(id),
    restaurant_id          UUID NOT NULL REFERENCES restaurant(id),
    delivery_partner_id    UUID REFERENCES delivery_partner(id),
    restaurant_rating      SMALLINT NOT NULL,
    delivery_rating        SMALLINT,
    comment                VARCHAR(1000),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_review_restaurant_rating CHECK (restaurant_rating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_delivery_rating CHECK (
        delivery_rating IS NULL OR delivery_rating BETWEEN 1 AND 5
    )
);

CREATE INDEX idx_review_restaurant ON review(restaurant_id);
CREATE INDEX idx_review_customer ON review(customer_id);
CREATE INDEX idx_review_delivery_partner ON review(delivery_partner_id)
    WHERE delivery_partner_id IS NOT NULL;
