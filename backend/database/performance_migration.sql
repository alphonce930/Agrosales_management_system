-- Run once for an existing Golden Agrochemicals database.
-- These indexes support the most frequent dashboard, user, sales, payment, and receipt queries.
CREATE INDEX idx_users_role_status ON users (role, status);
CREATE INDEX idx_sales_staff_date ON sales (staff_id, sale_date);
CREATE INDEX idx_sales_customer_balance ON sales (customer_id, balance);
CREATE INDEX idx_payments_created_at ON payments (created_at);
CREATE INDEX idx_receipts_issued_at ON receipts (issued_at);
