-- Module 12: Coupon (API Contracts MODULE 11 / Phase3 §2.12, §3.8)
-- Owns: coupon, coupon_redemption
-- Soft-delete on coupon only. coupon_redemption is never soft-deleted.
-- version on coupon: Phase3 §19.9 optimistic locking for concurrent redemption / usage-limit races.
-- order.coupon_id FK deferred from V7 until this module's table exists.

CREATE TABLE coupon (
    id                     UUID PRIMARY KEY,
    code                   VARCHAR(30) NOT NULL,
    discount_type          VARCHAR(10) NOT NULL,
    value                  DECIMAL(10,2) NOT NULL,
    min_order_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_discount_amount    DECIMAL(10,2),
    expiry_date            TIMESTAMPTZ NOT NULL,
    usage_limit_total      INT,
    usage_limit_per_user   INT NOT NULL DEFAULT 1,
    restaurant_id          UUID REFERENCES restaurant(id) ON DELETE RESTRICT,
    is_active              BOOLEAN NOT NULL DEFAULT TRUE,
    version                BIGINT NOT NULL DEFAULT 0,
    deleted_at             TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_coupon_code UNIQUE (code),
    CONSTRAINT chk_coupon_discount_type CHECK (discount_type IN ('FLAT', 'PERCENT')),
    CONSTRAINT chk_coupon_value CHECK (value > 0),
    CONSTRAINT chk_coupon_min_order CHECK (min_order_amount >= 0),
    CONSTRAINT chk_coupon_usage_limit_per_user CHECK (usage_limit_per_user >= 1),
    CONSTRAINT chk_coupon_usage_limit_total CHECK (
        usage_limit_total IS NULL OR usage_limit_total > 0
    )
);

CREATE TABLE coupon_redemption (
    id            UUID PRIMARY KEY,
    coupon_id     UUID NOT NULL REFERENCES coupon(id) ON DELETE RESTRICT,
    customer_id   UUID NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    order_id      UUID NOT NULL REFERENCES "order"(id) ON DELETE RESTRICT,
    redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_coupon_code ON coupon(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_coupon_redemption_coupon ON coupon_redemption(coupon_id);
CREATE INDEX idx_coupon_redemption_customer_coupon ON coupon_redemption(customer_id, coupon_id);
CREATE INDEX idx_coupon_redemption_order ON coupon_redemption(order_id);

ALTER TABLE "order"
    ADD CONSTRAINT fk_order_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupon(id) ON DELETE RESTRICT;
