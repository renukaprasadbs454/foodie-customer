-- V23: Add restaurant_type and rejection_reason to restaurant table
ALTER TABLE restaurant DROP CONSTRAINT IF EXISTS chk_restaurant_status;
ALTER TABLE restaurant ADD CONSTRAINT chk_restaurant_status CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'));

ALTER TABLE restaurant ADD COLUMN IF NOT EXISTS restaurant_type VARCHAR(30) NOT NULL DEFAULT 'BOTH';
ALTER TABLE restaurant ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);
