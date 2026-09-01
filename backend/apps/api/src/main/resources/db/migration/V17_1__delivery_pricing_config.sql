-- Module 9: Delivery Pricing Configuration (Min Price per Delivery vs. Money per KM)

CREATE TABLE IF NOT EXISTS delivery_pricing_config (
    id                      UUID PRIMARY KEY,
    min_price_per_delivery DECIMAL(10,2) NOT NULL DEFAULT 200.00,
    money_per_km            DECIMAL(10,2) NOT NULL DEFAULT 25.00,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by              UUID REFERENCES admin_user(id) ON DELETE SET NULL
);

-- Seed initial default delivery pricing configuration (Min Price: 200.00, Money/KM: 25.00)
INSERT INTO delivery_pricing_config (id, min_price_per_delivery, money_per_km, created_at, updated_at)
VALUES ('99999999-9999-9999-9999-999999999999', 200.00, 25.00, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
