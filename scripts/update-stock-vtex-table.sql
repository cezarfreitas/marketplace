-- Script para atualizar a estrutura da tabela stock_vtex
-- Baseado na estrutura fornecida pelo usuário

-- Verificar se a coluna id existe e renomear para id_stock_vtex
-- Se a coluna id existe, vamos renomeá-la para id_stock_vtex
ALTER TABLE stock_vtex CHANGE COLUMN id id_stock_vtex INT NOT NULL AUTO_INCREMENT COMMENT 'ID único do estoque VTEX';

-- Verificar se a coluna sku_id existe e renomear para id_sku_vtex
-- Se a coluna sku_id existe, vamos renomeá-la para id_sku_vtex
ALTER TABLE stock_vtex CHANGE COLUMN sku_id id_sku_vtex INT NOT NULL COMMENT 'ID do SKU VTEX';

-- Verificar se a coluna vtex_sku_id existe, se existir, remover (redundante)
-- Se a coluna vtex_sku_id existe, vamos removê-la pois é redundante
ALTER TABLE stock_vtex DROP COLUMN IF EXISTS vtex_sku_id;

-- Remover outras colunas que não fazem parte da estrutura atual
ALTER TABLE stock_vtex DROP COLUMN IF EXISTS reserved_quantity;
ALTER TABLE stock_vtex DROP COLUMN IF EXISTS has_unlimited_quantity;
ALTER TABLE stock_vtex DROP COLUMN IF EXISTS unlimited_stock;
ALTER TABLE stock_vtex DROP COLUMN IF EXISTS time_to_refill;
ALTER TABLE stock_vtex DROP COLUMN IF EXISTS date_of_supply_utc;
ALTER TABLE stock_vtex DROP COLUMN IF EXISTS date_utc_on_balance_system;
ALTER TABLE stock_vtex DROP COLUMN IF EXISTS lead_time;

-- Verificar a estrutura atual da tabela
DESCRIBE stock_vtex;

-- Exemplo de consulta com a nova estrutura
SELECT 
  id_stock_vtex,
  id_sku_vtex,
  warehouse_id,
  warehouse_name,
  total_quantity,
  created_at,
  updated_at
FROM stock_vtex 
LIMIT 5;