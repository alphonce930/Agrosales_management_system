ALTER TABLE users
  ALTER COLUMN role TYPE TEXT;

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'staff';

ALTER TABLE users
  ADD CONSTRAINT IF NOT EXISTS users_role_check CHECK (role IN ('super_admin','admin','staff'));