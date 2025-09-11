-- Script para ajustar a tabela stock_vtex conforme o JSON da API VTEX
-- Campos necessários baseados no JSON:
-- {
--   "warehouseId": "1",
--   "warehouseName": "eStyle", 
--   "totalQuantity": 0,
--   "reservedQuantity": 0,
--   "hasUnlimitedQuantity": false,
--   "timeToRefill": null,
--   "dateOfSupplyUtc": null,
--   "leadTime": "00:00:00"
-- }

-- 1. Adicionar campo hasUnlimitedQuantity (se não existir)
ALTER TABLE stock_vtex 
ADD COLUMN IF NOT EXISTS has_unlimited_quantity TINYINT(1) DEFAULT 0 
COMMENT 'Indica se o estoque é ilimitado';

-- 2. Adicionar campo dateOfSupplyUtc (se não existir)
ALTER TABLE stock_vtex 
ADD COLUMN IF NOT EXISTS date_of_supply_utc DATETIME NULL 
COMMENT 'Data de fornecimento em UTC';

-- 3. Adicionar campo leadTime (se não existir)
ALTER TABLE stock_vtex 
ADD COLUMN IF NOT EXISTS lead_time TIME NULL 
COMMENT 'Tempo de lead para reabastecimento';

-- 4. Adicionar campo vtex_sku_id para referência (se não existir)
ALTER TABLE stock_vtex 
ADD COLUMN IF NOT EXISTS vtex_sku_id VARCHAR(50) NULL 
COMMENT 'ID do SKU na VTEX';

-- 5. Criar índice para vtex_sku_id (se não existir)
CREATE INDEX IF NOT EXISTS idx_stock_vtex_vtex_sku_id ON stock_vtex(vtex_sku_id);

-- 6. Atualizar comentários dos campos existentes
ALTER TABLE stock_vtex 
MODIFY COLUMN warehouse_id VARCHAR(50) NOT NULL COMMENT 'ID do warehouse na VTEX',
MODIFY COLUMN warehouse_name VARCHAR(255) NULL COMMENT 'Nome do warehouse',
MODIFY COLUMN total_quantity INT DEFAULT 0 COMMENT 'Quantidade total disponível',
MODIFY COLUMN reserved_quantity INT DEFAULT 0 COMMENT 'Quantidade reservada',
MODIFY COLUMN time_to_refill INT DEFAULT 0 COMMENT 'Tempo para reabastecimento em dias';

-- 7. Verificar estrutura final
DESCRIBE stock_vtex;
