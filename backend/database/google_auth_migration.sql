USE golden_agrochemicals;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE AFTER password,
  ADD COLUMN IF NOT EXISTS profile_picture TEXT AFTER google_id,
  ADD COLUMN IF NOT EXISTS auth_provider ENUM('local','google') NOT NULL DEFAULT 'local' AFTER profile_picture;