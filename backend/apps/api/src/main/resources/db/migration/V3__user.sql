-- Module 2: User
-- Owns: customer, address (Phase3 §3.3)
-- Customer delivery addresses exclusively — never restaurant locations.

CREATE TABLE customer (
    id                    UUID PRIMARY KEY,
    user_credential_id    UUID NOT NULL UNIQUE REFERENCES user_credential(id) ON DELETE RESTRICT,
    full_name             VARCHAR(255) NOT NULL,
    email                 VARCHAR(255),
    profile_image_key     VARCHAR(500),
    default_address_id    UUID,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL
);

CREATE TABLE address (
    id            UUID PRIMARY KEY,
    customer_id   UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    label         VARCHAR(50),
    line1         VARCHAR(255) NOT NULL,
    line2         VARCHAR(255),
    city          VARCHAR(100) NOT NULL,
    pincode       VARCHAR(10) NOT NULL,
    latitude      DECIMAL(9,6) NOT NULL,
    longitude     DECIMAL(9,6) NOT NULL,
    is_default    BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL
);

ALTER TABLE customer
    ADD CONSTRAINT fk_customer_default_address
        FOREIGN KEY (default_address_id) REFERENCES address(id);

CREATE INDEX idx_address_customer ON address(customer_id) WHERE deleted_at IS NULL;
