-- Tabela para SKU Sellers (vendedores de SKUs)
CREATE TABLE IF NOT EXISTS sku_sellers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku_id INT NOT NULL,
    seller_id VARCHAR(255) NOT NULL,
    seller_sku_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    freight_commission_percentage DECIMAL(5,2) DEFAULT 0.00,
    product_commission_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sku_id (sku_id),
    INDEX idx_seller_id (seller_id),
    INDEX idx_seller_sku_id (seller_sku_id),
    INDEX idx_is_active (is_active),
    FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE CASCADE,
    UNIQUE KEY unique_sku_seller (sku_id, seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
