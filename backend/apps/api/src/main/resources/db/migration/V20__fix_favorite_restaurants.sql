-- V18: Ensure address columns and favorite_restaurants table exist

ALTER TABLE address ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(100);
ALTER TABLE address ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20);
ALTER TABLE address ADD COLUMN IF NOT EXISTS house_flat_no VARCHAR(100);
ALTER TABLE address ADD COLUMN IF NOT EXISTS landmark VARCHAR(255);
ALTER TABLE address ADD COLUMN IF NOT EXISTS state VARCHAR(100);

CREATE TABLE IF NOT EXISTS favorite_restaurants (
    id            UUID PRIMARY KEY,
    customer_id   UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_customer_restaurant_favorite UNIQUE (customer_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_fav_rest_customer ON favorite_restaurants(customer_id);

ALTER TABLE favorite_restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
