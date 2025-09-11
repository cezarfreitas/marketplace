-- Adicionar campos que estão faltando na tabela skus baseado na API da VTEX
ALTER TABLE skus 
ADD COLUMN IF NOT EXISTS ref_id VARCHAR(255) AFTER sku_name,
ADD COLUMN IF NOT EXISTS height DECIMAL(10,2) AFTER ref_id,
ADD COLUMN IF NOT EXISTS real_height DECIMAL(10,2) AFTER height,
ADD COLUMN IF NOT EXISTS width DECIMAL(10,2) AFTER real_height,
ADD COLUMN IF NOT EXISTS real_width DECIMAL(10,2) AFTER width,
ADD COLUMN IF NOT EXISTS length DECIMAL(10,2) AFTER real_width,
ADD COLUMN IF NOT EXISTS real_length DECIMAL(10,2) AFTER length,
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,2) AFTER real_length,
ADD COLUMN IF NOT EXISTS real_weight_kg DECIMAL(10,2) AFTER weight_kg,
ADD COLUMN IF NOT EXISTS modal_id INT AFTER real_weight_kg,
ADD COLUMN IF NOT EXISTS cubic_weight DECIMAL(10,2) AFTER modal_id,
ADD COLUMN IF NOT EXISTS internal_note TEXT AFTER cubic_weight,
ADD COLUMN IF NOT EXISTS date_updated TIMESTAMP AFTER internal_note,
ADD COLUMN IF NOT EXISTS flag_kit_itens_sell_apart BOOLEAN DEFAULT FALSE AFTER date_updated,
ADD COLUMN IF NOT EXISTS reference_stock_keeping_unit_id INT AFTER flag_kit_itens_sell_apart,
ADD COLUMN IF NOT EXISTS position INT AFTER reference_stock_keeping_unit_id,
ADD COLUMN IF NOT EXISTS activate_if_possible BOOLEAN DEFAULT TRUE AFTER position,
ADD COLUMN IF NOT EXISTS is_kit_optimized BOOLEAN DEFAULT FALSE AFTER activate_if_possible;

-- Adicionar índices para os novos campos importantes
ALTER TABLE skus 
ADD INDEX IF NOT EXISTS idx_ref_id (ref_id),
ADD INDEX IF NOT EXISTS idx_position (position),
ADD INDEX IF NOT EXISTS idx_date_updated (date_updated);
