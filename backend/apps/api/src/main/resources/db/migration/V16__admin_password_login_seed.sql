-- GAP-API-13: Admin email/password authentication seed
-- DEVELOPMENT / LOCAL credentials ONLY — never reuse in production.
--
-- Role:  SUPER_ADMIN
-- Email: admin@foodie.local
-- Password: ChangeMe@123  (BCrypt $2a$ — never stored as plaintext)
--
-- Updates the bootstrap SUPER_ADMIN from V14 to the documented login identity.

UPDATE user_credential
SET email = 'admin@foodie.local',
    password_hash = '$2a$10$UAwCF/QkMLt.caFqCRE7yu3V4Yg3upmgTKSxT9N7PMEI2GcAqtfFy',
    updated_at = now()
WHERE id = '33333333-3333-3333-3333-333333333001';

UPDATE admin_user
SET full_name = 'Bootstrap Super Admin',
    updated_at = now()
WHERE id = '44444444-4444-4444-4444-444444444001';
