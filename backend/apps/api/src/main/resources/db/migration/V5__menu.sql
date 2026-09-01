-- Module 4: Menu
-- Owns: category, menu_item, variant (Phase3 §3.4)
-- Soft-delete via deleted_at (Phase3 §3.1)

CREATE TABLE category (
    id              UUID PRIMARY KEY,
    restaurant_id   UUID NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    display_order   INT NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE menu_item (
    id              UUID PRIMARY KEY,
    restaurant_id   UUID NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES category(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    base_price      DECIMAL(10,2) NOT NULL,
    image_s3_key    VARCHAR(500),
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    is_veg          BOOLEAN NOT NULL,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_menu_item_base_price CHECK (base_price >= 0)
);

CREATE TABLE variant (
    id            UUID PRIMARY KEY,
    menu_item_id  UUID NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    price_delta   DECIMAL(10,2) NOT NULL DEFAULT 0,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_category_restaurant ON category(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_item_restaurant_available
    ON menu_item(restaurant_id) WHERE is_available = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_menu_item_category ON menu_item(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_variant_menu_item ON variant(menu_item_id) WHERE deleted_at IS NULL;
