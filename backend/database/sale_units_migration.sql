-- Run once for an existing Golden Agrochemicals database.
-- Inventory and prices are stored per individual piece.
ALTER TABLE products ADD COLUMN IF NOT EXISTS pieces_per_box INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'single' CHECK (unit IN ('single','dozen','box'));
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS base_quantity INTEGER NOT NULL DEFAULT 0;

-- Existing sales were entered as individual pieces.
UPDATE sale_items SET base_quantity = quantity WHERE base_quantity = 0;
