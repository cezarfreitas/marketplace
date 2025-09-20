-- Criar tabela crop_processing_logs para logs de processamento de imagens
CREATE TABLE IF NOT EXISTS crop_processing_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    anymarket_id VARCHAR(50),
    product_name VARCHAR(255),
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    total_images INT DEFAULT 0,
    processed_images INT DEFAULT 0,
    failed_images INT DEFAULT 0,
    pixian_success_count INT DEFAULT 0,
    pixian_error_count INT DEFAULT 0,
    anymarket_success_count INT DEFAULT 0,
    anymarket_error_count INT DEFAULT 0,
    processing_time_seconds DECIMAL(10,2) DEFAULT 0,
    error_message TEXT,
    details JSON,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_product_id (product_id),
    INDEX idx_anymarket_id (anymarket_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
