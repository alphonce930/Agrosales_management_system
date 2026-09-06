USE golden_agrochemicals;

ALTER TABLE users
  MODIFY role ENUM('super_admin','admin','staff') NOT NULL DEFAULT 'staff';

INSERT INTO users (full_name, username, email, phone, location, password, role, status)
SELECT 'Super Administrator', 'superadmin', 'superadmin@goldenagro.com', '+255700000000', 'Dar es Salaam', '$2a$10$DjDxTLtGZWgOJQJktOf3re7VaZceNmVm0WUmxBhLp2io8ybmHm1s6', 'super_admin', 'verified'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'superadmin' OR email = 'superadmin@goldenagro.com');