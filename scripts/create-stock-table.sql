-- Script para criar a tabela de estoque baseada na API VTEX
-- Baseado na resposta da API: /api/logistics/pvt/inventory/skus/{skuId}
-- Estrutura da resposta VTEX:
-- {
--   "skuId": "10",
--   "balance": [
--     {
--       "warehouseId": "1fabf84",
--       "warehouseName": "Main Warehouse",
--       "totalQuantity": 0,
--       "reservedQuantity": 0,
--       "hasUnlimitedQuantity": false,
--       "timeToRefill": null,
--       "dateOfSupplyUtc": null,
--       "leadTime": "00:00:00"
--     }
--   ]
-- }

-- Dropar a tabela se existir (cuidado em produção!)
DROP TABLE IF EXISTS stock;

-- Criar tabela de estoque
CREATE TABLE stock (
    -- ID interno do registro
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Relacionamento com SKU interno
    sku_id INT NOT NULL COMMENT 'ID interno do SKU na tabela skus',
    
    -- ID do SKU na VTEX (para referência)
    vtex_sku_id INT NOT NULL COMMENT 'ID do SKU na VTEX',
    
    -- Dados do warehouse
    warehouse_id VARCHAR(255) NOT NULL COMMENT 'ID do warehouse na VTEX',
    warehouse_name VARCHAR(255) NOT NULL COMMENT 'Nome do warehouse',
    
    -- Quantidades de estoque
    total_quantity INT DEFAULT 0 COMMENT 'Quantidade total disponível',
    reserved_quantity INT DEFAULT 0 COMMENT 'Quantidade reservada',
    
    -- Configurações do warehouse
    has_unlimited_quantity BOOLEAN DEFAULT FALSE COMMENT 'Se o warehouse tem quantidade ilimitada',
    
    -- Tempos e datas
    time_to_refill VARCHAR(50) COMMENT 'Tempo para reabastecimento',
    date_of_supply_utc DATETIME COMMENT 'Data de fornecimento em UTC',
    lead_time VARCHAR(50) COMMENT 'Tempo de entrega (formato HH:MM:SS)',
    
    -- Timestamps de controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de última atualização',
    
    -- Índices para performance
    INDEX idx_sku_id (sku_id),
    INDEX idx_vtex_sku_id (vtex_sku_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_warehouse_name (warehouse_name),
    INDEX idx_total_quantity (total_quantity),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at),
    
    -- Índice composto para consultas frequentes
    INDEX idx_sku_warehouse (sku_id, warehouse_id),
    
    -- Chave única para evitar duplicatas (mesmo SKU + mesmo warehouse)
    UNIQUE KEY unique_sku_warehouse (sku_id, warehouse_id),
    
    -- Chave estrangeira para SKUs (usando tabela skus_vtex)
    FOREIGN KEY (sku_id) REFERENCES skus_vtex(id) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Tabela de estoque baseada na API VTEX /api/logistics/pvt/inventory/skus/{skuId}';

-- Adicionar comentários nas colunas principais
ALTER TABLE stock 
    MODIFY COLUMN sku_id INT NOT NULL COMMENT 'ID interno do SKU (FK para tabela skus_vtex)',
    MODIFY COLUMN vtex_sku_id INT NOT NULL COMMENT 'ID do SKU na VTEX (para referência)',
    MODIFY COLUMN warehouse_id VARCHAR(255) NOT NULL COMMENT 'ID único do warehouse na VTEX',
    MODIFY COLUMN warehouse_name VARCHAR(255) NOT NULL COMMENT 'Nome descritivo do warehouse',
    MODIFY COLUMN total_quantity INT DEFAULT 0 COMMENT 'Quantidade total disponível no warehouse',
    MODIFY COLUMN reserved_quantity INT DEFAULT 0 COMMENT 'Quantidade reservada (não disponível para venda)',
    MODIFY COLUMN has_unlimited_quantity BOOLEAN DEFAULT FALSE COMMENT 'Indica se o warehouse tem estoque ilimitado';

-- Criar view para consultas de estoque com informações do produto
CREATE OR REPLACE VIEW v_stock_with_products AS
SELECT 
    s.id as stock_id,
    s.sku_id,
    s.vtex_sku_id,
    s.warehouse_id,
    s.warehouse_name,
    s.total_quantity,
    s.reserved_quantity,
    s.has_unlimited_quantity,
    s.time_to_refill,
    s.date_of_supply_utc,
    s.lead_time,
    s.created_at,
    s.updated_at,
    
    -- Dados do SKU
    sk.name_complete as sku_name,
    sk.is_active as sku_active,
    
    -- Dados do produto
    p.id as product_id,
    p.vtex_id as product_vtex_id,
    p.name as product_name,
    p.ref_id as product_ref_id,
    p.is_active as product_active,
    p.is_visible as product_visible,
    
    -- Dados da marca
    b.name as brand_name,
    
    -- Dados da categoria
    c.name as category_name,
    
    -- Cálculo de estoque disponível
    (s.total_quantity - s.reserved_quantity) as available_quantity,
    
    -- Status do estoque
    CASE 
        WHEN s.has_unlimited_quantity = 1 THEN 'Ilimitado'
        WHEN s.total_quantity > 0 THEN 'Em estoque'
        WHEN s.total_quantity = 0 AND s.reserved_quantity > 0 THEN 'Reservado'
        ELSE 'Sem estoque'
    END as stock_status

FROM stock s
JOIN skus_vtex sk ON s.sku_id = sk.id
JOIN products_vtex p ON sk.product_id = p.id
LEFT JOIN brands_vtex b ON p.brand_id = b.id
LEFT JOIN categories_vtex c ON p.category_id = c.id
ORDER BY p.name, sk.name_complete, s.warehouse_name;

-- Criar view para resumo de estoque por produto
CREATE OR REPLACE VIEW v_product_stock_summary AS
SELECT 
    p.id as product_id,
    p.vtex_id as product_vtex_id,
    p.name as product_name,
    p.ref_id as product_ref_id,
    p.is_active as product_active,
    p.is_visible as product_visible,
    
    -- Contadores
    COUNT(DISTINCT s.sku_id) as total_skus,
    COUNT(DISTINCT s.warehouse_id) as total_warehouses,
    
    -- Somas de estoque
    SUM(s.total_quantity) as total_stock,
    SUM(s.reserved_quantity) as total_reserved,
    SUM(s.total_quantity - s.reserved_quantity) as total_available,
    
    -- Status do produto
    CASE 
        WHEN SUM(s.total_quantity) > 0 THEN 'Em estoque'
        WHEN SUM(s.reserved_quantity) > 0 THEN 'Reservado'
        ELSE 'Sem estoque'
    END as product_stock_status,
    
    -- Data da última atualização
    MAX(s.updated_at) as last_stock_update

FROM products_vtex p
LEFT JOIN skus_vtex sk ON p.id = sk.product_id
LEFT JOIN stock s ON sk.id = s.sku_id
GROUP BY p.id, p.vtex_id, p.name, p.ref_id, p.is_active, p.is_visible
ORDER BY p.name;

-- Inserir dados de exemplo (opcional - remover em produção)
-- INSERT INTO stock (sku_id, vtex_sku_id, warehouse_id, warehouse_name, total_quantity, reserved_quantity, has_unlimited_quantity, lead_time) VALUES
-- (1, 10, '1fabf84', 'Main Warehouse', 100, 5, FALSE, '00:00:00'),
-- (1, 10, '14e3fcc', 'Warehouse dew56', 50, 0, FALSE, '1.00:00:00'),
-- (1, 10, '102e53e', 'wh-03', 25, 2, FALSE, '00:00:00');

-- Verificar se a tabela foi criada corretamente
SELECT 
    'Tabela stock criada com sucesso!' as status,
    COUNT(*) as total_columns
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'stock';

-- Mostrar estrutura da tabela
DESCRIBE stock;
