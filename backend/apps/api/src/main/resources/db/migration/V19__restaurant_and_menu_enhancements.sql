-- V19: Restaurant & Menu Module Enhancements
-- 1. Restaurant Address enhancement: landmark, state, country, formatted_address
-- 2. Restaurant Bank Details table for payout disbursements & verification
-- 3. Menu Item food_type column support

-- 1. Restaurant Address
ALTER TABLE restaurant_address ADD COLUMN IF NOT EXISTS landmark VARCHAR(255);
ALTER TABLE restaurant_address ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE restaurant_address ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE restaurant_address ADD COLUMN IF NOT EXISTS formatted_address VARCHAR(500);

-- 2. Restaurant Bank Details
CREATE TABLE IF NOT EXISTS restaurant_bank_details (
    id                      UUID PRIMARY KEY,
    restaurant_id           UUID NOT NULL UNIQUE REFERENCES restaurant(id) ON DELETE CASCADE,
    account_holder_name     VARCHAR(255),
    bank_name               VARCHAR(255),
    account_number          VARCHAR(100),
    ifsc_code               VARCHAR(30),
    account_type            VARCHAR(20) DEFAULT 'CURRENT',
    branch_name             VARCHAR(255),
    verification_status     VARCHAR(20) NOT NULL DEFAULT 'NOT_SUBMITTED',
    upi_id                  VARCHAR(255),
    upi_verification_status VARCHAR(20) NOT NULL DEFAULT 'NOT_SUBMITTED',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_bank_account_type CHECK (account_type IN ('SAVINGS', 'CURRENT')),
    CONSTRAINT chk_bank_verification_status CHECK (verification_status IN ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED')),
    CONSTRAINT chk_upi_verification_status CHECK (upi_verification_status IN ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_restaurant_bank_details_restaurant ON restaurant_bank_details(restaurant_id);

-- 3. Menu Item food_type
ALTER TABLE menu_item ADD COLUMN IF NOT EXISTS food_type VARCHAR(20) DEFAULT 'VEG';
UPDATE menu_item SET food_type = CASE WHEN is_veg THEN 'VEG' ELSE 'NON_VEG' END WHERE food_type IS NULL;
