-- Module 8: Delivery
-- Owns: delivery_partner, delivery_partner_document, delivery_assignment (Phase3 §3.7)
-- Live location is Redis GEO only — no table.
-- verified_by has no FK until Admin admin_user exists.

CREATE TABLE delivery_partner (
    id                  UUID PRIMARY KEY,
    user_credential_id  UUID NOT NULL UNIQUE REFERENCES user_credential(id),
    full_name           VARCHAR(255) NOT NULL,
    vehicle_type        VARCHAR(20) NOT NULL,
    vehicle_number      VARCHAR(20),
    profile_image_key   VARCHAR(500),
    kyc_status          VARCHAR(20) NOT NULL,
    is_online           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_delivery_partner_kyc CHECK (kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    CONSTRAINT chk_delivery_partner_vehicle CHECK (vehicle_type IN ('BIKE', 'SCOOTER', 'CYCLE', 'CAR'))
);

CREATE TABLE delivery_partner_document (
    id                    UUID PRIMARY KEY,
    delivery_partner_id   UUID NOT NULL REFERENCES delivery_partner(id) ON DELETE CASCADE,
    doc_type              VARCHAR(20) NOT NULL,
    s3_key                VARCHAR(500) NOT NULL,
    verification_status   VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    verified_by           UUID,
    verified_at           TIMESTAMPTZ,
    remarks               VARCHAR(500),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_delivery_doc_type CHECK (doc_type IN ('LICENSE', 'VEHICLE_RC', 'IDENTITY')),
    CONSTRAINT chk_delivery_doc_status CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED'))
);

CREATE TABLE delivery_assignment (
    id                    UUID PRIMARY KEY,
    order_id              UUID NOT NULL UNIQUE REFERENCES "order"(id),
    delivery_partner_id   UUID NOT NULL REFERENCES delivery_partner(id),
    status                VARCHAR(20) NOT NULL,
    pickup_otp_hash       VARCHAR(255) NOT NULL,
    pickup_verified_at    TIMESTAMPTZ,
    delivery_otp_hash     VARCHAR(255) NOT NULL,
    delivered_verified_at TIMESTAMPTZ,
    assigned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    version               BIGINT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_delivery_assignment_status
        CHECK (status IN ('OFFERED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'))
);

CREATE INDEX idx_delivery_partner_online ON delivery_partner(is_online) WHERE is_online = TRUE;
CREATE INDEX idx_delivery_assignment_partner ON delivery_assignment(delivery_partner_id);
CREATE INDEX idx_delivery_assignment_status ON delivery_assignment(status);
CREATE INDEX idx_delivery_partner_document_partner ON delivery_partner_document(delivery_partner_id);
