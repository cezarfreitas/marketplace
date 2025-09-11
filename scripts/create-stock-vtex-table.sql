-- Criar tabela stock_vtex para armazenar dados de estoque do VTEX
CREATE TABLE IF NOT EXISTS stock_vtex (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku_id INT NOT NULL,
    vtex_sku_id VARCHAR(50) NOT NULL,
    warehouse_id VARCHAR(50) NOT NULL,
    warehouse_name VARCHAR(255) NOT NULL,
    total_quantity INT DEFAULT 0,
    reserved_quantity INT DEFAULT 0,
    has_unlimited_quantity BOOLEAN DEFAULT FALSE,
    time_to_refill VARCHAR(50) NULL,
    date_of_supply_utc DATETIME NULL,
    lead_time VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para melhor performance
    INDEX idx_sku_id (sku_id),
    INDEX idx_vtex_sku_id (vtex_sku_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_warehouse_name (warehouse_name),
    
    -- Chave única para evitar duplicatas
    UNIQUE KEY unique_sku_warehouse (vtex_sku_id, warehouse_id),
    
    -- Foreign key para skus
    FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
