-- Script simples para criar a tabela de estoque
DROP TABLE IF EXISTS stock;

CREATE TABLE stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku_id INT NOT NULL,
    vtex_sku_id INT NOT NULL,
    warehouse_id VARCHAR(255) NOT NULL,
    warehouse_name VARCHAR(255) NOT NULL,
    total_quantity INT DEFAULT 0,
    reserved_quantity INT DEFAULT 0,
    has_unlimited_quantity BOOLEAN DEFAULT FALSE,
    time_to_refill VARCHAR(50),
    date_of_supply_utc DATETIME,
    lead_time VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_sku_id (sku_id),
    INDEX idx_vtex_sku_id (vtex_sku_id),
    INDEX idx_warehouse_id (warehouse_id),
    INDEX idx_warehouse_name (warehouse_name),
    INDEX idx_total_quantity (total_quantity),
    INDEX idx_sku_warehouse (sku_id, warehouse_id),
    
    UNIQUE KEY unique_sku_warehouse (sku_id, warehouse_id),
    FOREIGN KEY (sku_id) REFERENCES skus_vtex(id) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
