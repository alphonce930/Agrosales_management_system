-- Add indexes for login performance optimization
-- These indexes improve the performance of login queries that search by email or username

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
