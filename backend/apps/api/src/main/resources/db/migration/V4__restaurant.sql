-- Module 3: Restaurant
-- Owns: restaurant_address, restaurant, restaurant_document (Phase3 §3.4)
-- Never reuses User-owned address table (v1.1).

CREATE TABLE restaurant_address (
    id            UUID PRIMARY KEY,
    line1         VARCHAR(255) NOT NULL,
    line2         VARCHAR(255),
    city          VARCHAR(100) NOT NULL,
    pincode       VARCHAR(10) NOT NULL,
    latitude      DECIMAL(9,6) NOT NULL,
    longitude     DECIMAL(9,6) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE restaurant (
    id                       UUID PRIMARY KEY,
    owner_user_credential_id UUID NOT NULL UNIQUE REFERENCES user_credential(id) ON DELETE RESTRICT,
    name                     VARCHAR(255) NOT NULL,
    description              TEXT,
    cuisine_types            TEXT[] NOT NULL,
    address_id               UUID NOT NULL REFERENCES restaurant_address(id) ON DELETE RESTRICT,
    latitude                 DECIMAL(9,6) NOT NULL,
    longitude                DECIMAL(9,6) NOT NULL,
    logo_image_key           VARCHAR(500),
    cover_image_key          VARCHAR(500),
    avg_rating               DECIMAL(2,1) NOT NULL DEFAULT 0,
    status                   VARCHAR(20) NOT NULL,
    commission_pct           DECIMAL(4,2) NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_restaurant_status
        CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED')),
    CONSTRAINT chk_restaurant_avg_rating
        CHECK (avg_rating >= 0 AND avg_rating <= 5)
);

CREATE TABLE restaurant_document (
    id             UUID PRIMARY KEY,
    restaurant_id  UUID NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
    doc_type       VARCHAR(20) NOT NULL,
    s3_key         VARCHAR(500) NOT NULL,
    verified_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_restaurant_document_doc_type
        CHECK (doc_type IN ('FSSAI', 'GST', 'PAN'))
);

CREATE INDEX idx_restaurant_status ON restaurant(status);
CREATE INDEX idx_restaurant_geo ON restaurant(latitude, longitude);
CREATE INDEX idx_restaurant_document_restaurant ON restaurant_document(restaurant_id);
