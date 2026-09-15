-- Run this file in the Neon SQL editor before deploying the backend.
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, full_name VARCHAR(255) NOT NULL, username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL, phone VARCHAR(50), location VARCHAR(255), password VARCHAR(255) NOT NULL,
  google_id VARCHAR(255) UNIQUE, profile_picture TEXT, auth_provider VARCHAR(20) NOT NULL DEFAULT 'local',
  role VARCHAR(20) NOT NULL DEFAULT 'staff', status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY, product_code VARCHAR(100) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, description TEXT,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL, unit VARCHAR(50) DEFAULT 'kg',
  quantity INT NOT NULL DEFAULT 0, buying_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0, minimum_stock INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY, customer_code VARCHAR(100) UNIQUE NOT NULL, full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50), alternative_phone VARCHAR(50), email VARCHAR(255), location VARCHAR(255), address TEXT,
  customer_type VARCHAR(20) NOT NULL DEFAULT 'individual', initial_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT, created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY, sale_number VARCHAR(100) UNIQUE NOT NULL, customer_id INT NOT NULL REFERENCES customers(id),
  staff_id INT NOT NULL REFERENCES users(id), total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0, balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_type VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'paid',
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY, sale_id INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id), quantity INT NOT NULL, unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY, payment_number VARCHAR(100) UNIQUE NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(id), sale_id INT NOT NULL REFERENCES sales(id),
  amount NUMERIC(12,2) NOT NULL, payment_method VARCHAR(20) NOT NULL, staff_id INT NOT NULL REFERENCES users(id),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY, receipt_number VARCHAR(100) UNIQUE NOT NULL, sale_id INT NOT NULL REFERENCES sales(id),
  customer_id INT NOT NULL REFERENCES customers(id), staff_id INT NOT NULL REFERENCES users(id),
  notes TEXT, issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100), entity_id INT, details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_staff ON sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_sale ON receipts(sale_id);
