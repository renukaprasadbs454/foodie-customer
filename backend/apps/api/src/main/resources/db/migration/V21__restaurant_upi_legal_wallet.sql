-- V21: Restaurant UPI, Business/Legal Details, and Restaurant Wallet support

-- Feature 1: Restaurant UPI fields
ALTER TABLE restaurant ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE restaurant ADD COLUMN IF NOT EXISTS upi_name VARCHAR(150);
ALTER TABLE restaurant ADD COLUMN IF NOT EXISTS upi_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE restaurant ADD COLUMN IF NOT EXISTS upi_verified_at TIMESTAMPTZ;

-- Feature 2: Restaurant Business/Legal Details table
CREATE TABLE IF NOT EXISTS restaurant_legal_detail (
    id                     UUID PRIMARY KEY,
    restaurant_id          UUID NOT NULL UNIQUE REFERENCES restaurant(id) ON DELETE CASCADE,
    gstin                  VARCHAR(20),
    pan                    VARCHAR(20),
    fssai_license_number   VARCHAR(30),
    legal_name             VARCHAR(255) NOT NULL,
    business_type          VARCHAR(50) NOT NULL,
    contact_email          VARCHAR(255) NOT NULL,
    contact_phone          VARCHAR(20) NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_legal_detail_restaurant ON restaurant_legal_detail(restaurant_id);

-- Feature 4: Allow RESTAURANT in wallet_account owner_type constraint
ALTER TABLE wallet_account DROP CONSTRAINT IF EXISTS chk_wallet_owner_type;
ALTER TABLE wallet_account ADD CONSTRAINT chk_wallet_owner_type CHECK (owner_type IN ('DELIVERY_PARTNER', 'PLATFORM', 'RESTAURANT'));
