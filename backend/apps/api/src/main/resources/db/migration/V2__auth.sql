-- Module 1: Authentication
-- Owns: user_credential, refresh_token (Phase3 §3.2)

CREATE TABLE user_credential (
    id                UUID PRIMARY KEY,
    phone_number      VARCHAR(15) UNIQUE,
    email             VARCHAR(255),
    password_hash     VARCHAR(255),
    google_id         VARCHAR(255) UNIQUE,
    user_type         VARCHAR(20) NOT NULL,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_user_credential_user_type
        CHECK (user_type IN ('CUSTOMER', 'RESTAURANT', 'DELIVERY_PARTNER', 'ADMIN')),
    CONSTRAINT chk_identity_present
        CHECK (phone_number IS NOT NULL OR google_id IS NOT NULL)
);

CREATE TABLE refresh_token (
    id                  UUID PRIMARY KEY,
    user_credential_id  UUID NOT NULL REFERENCES user_credential(id) ON DELETE CASCADE,
    token_hash          VARCHAR(255) NOT NULL UNIQUE,
    expires_at          TIMESTAMPTZ NOT NULL,
    is_revoked          BOOLEAN NOT NULL DEFAULT FALSE,
    replaced_by_id      UUID REFERENCES refresh_token(id),
    device_info         VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_refresh_token_user ON refresh_token(user_credential_id);
