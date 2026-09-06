USE golden_agrochemicals;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS initial_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER customer_type;