-- Run once for an existing Golden Agrochemicals database.
-- Inventory and prices are stored per individual piece.
ALTER TABLE products ADD COLUMN pieces_per_box INT NOT NULL DEFAULT 1 AFTER selling_price;
ALTER TABLE sale_items ADD COLUMN unit ENUM('single','dozen','box') NOT NULL DEFAULT 'single' AFTER quantity;
ALTER TABLE sale_items ADD COLUMN base_quantity INT NOT NULL DEFAULT 0 AFTER unit;

-- Existing sales were entered as individual pieces.
UPDATE sale_items SET base_quantity = quantity WHERE base_quantity = 0;
