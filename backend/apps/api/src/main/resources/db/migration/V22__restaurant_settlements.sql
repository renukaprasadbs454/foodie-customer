-- Module 10: Restaurant Settlement & Financial Payouts
-- Manages restaurant earnings, commission splits, payout disbursements, and settlement ledger.

CREATE TABLE restaurant_settlement (
    id                      UUID PRIMARY KEY,
    restaurant_id           UUID NOT NULL REFERENCES restaurant(id) ON DELETE RESTRICT,
    settlement_number       VARCHAR(100) NOT NULL UNIQUE,
    settlement_period_start TIMESTAMPTZ NOT NULL,
    settlement_period_end   TIMESTAMPTZ NOT NULL,
    gross_sales             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    commission_amount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_deducted            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    net_payable             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_reference       VARCHAR(100),
    disbursed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_restaurant_settlement_status
        CHECK (status IN ('PENDING', 'APPROVED', 'DISBURSED', 'FAILED'))
);

CREATE INDEX idx_rest_settlement_restaurant ON restaurant_settlement(restaurant_id);
CREATE INDEX idx_rest_settlement_status ON restaurant_settlement(status);

-- Update wallet_account constraint to include RESTAURANT owner type if constrained
ALTER TABLE wallet_account DROP CONSTRAINT IF EXISTS chk_wallet_account_owner_type;
ALTER TABLE wallet_account ADD CONSTRAINT chk_wallet_account_owner_type
    CHECK (owner_type IN ('DELIVERY_PARTNER', 'PLATFORM', 'CUSTOMER', 'RESTAURANT'));
