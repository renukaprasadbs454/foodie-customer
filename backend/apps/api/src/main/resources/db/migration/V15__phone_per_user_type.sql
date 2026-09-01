-- Allow the same phone number across Customer / Restaurant / Delivery Partner apps.
-- Identity key becomes (phone_number, user_type). ADMIN phones remain exclusive via app rules.

ALTER TABLE user_credential DROP CONSTRAINT IF EXISTS user_credential_phone_number_key;

CREATE UNIQUE INDEX uq_user_credential_phone_user_type
    ON user_credential (phone_number, user_type)
    WHERE phone_number IS NOT NULL;
