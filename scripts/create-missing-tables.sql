-- Script para criar as tabelas que estão faltando no banco de dados
-- Banco: meli

-- Tabela para rastrear produtos processados
CREATE TABLE IF NOT EXISTS processed_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    anymarket_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    last_processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_processing_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    UNIQUE KEY unique_product_anymarket (product_id, anymarket_id),
    INDEX idx_product_id (product_id),
    INDEX idx_anymarket_id (anymarket_id),
    INDEX idx_last_processed_at (last_processed_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela para rastrear produtos que foram processados';

-- Tabela para logs de processamento de imagens
CREATE TABLE IF NOT EXISTS crop_processing_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    anymarket_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    status ENUM('processing', 'completed', 'failed', 'cancelled') DEFAULT 'processing',
    total_images INT DEFAULT 0,
    processed_images INT DEFAULT 0,
    failed_images INT DEFAULT 0,
    pixian_success_count INT DEFAULT 0,
    pixian_error_count INT DEFAULT 0,
    anymarket_success_count INT DEFAULT 0,
    anymarket_error_count INT DEFAULT 0,
    processing_time_seconds INT DEFAULT 0,
    error_message TEXT,
    details JSON,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_product_id (product_id),
    INDEX idx_anymarket_id (anymarket_id),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at),
    INDEX idx_completed_at (completed_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela para logs de processamento de imagens';

-- Comentários para documentação
ALTER TABLE processed_products COMMENT = 'Tabela para rastrear produtos que foram processados pelo sistema de crop de imagens';
ALTER TABLE crop_processing_logs COMMENT = 'Tabela para logs detalhados do processamento de imagens';
