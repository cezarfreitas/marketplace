-- Script para criar a tabela anymarket_sync_logs
-- Execute este script no seu banco de dados MySQL

USE seo_db;

-- Criar a tabela anymarket_sync_logs
CREATE TABLE IF NOT EXISTS anymarket_sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  anymarket_id VARCHAR(255),
  title VARCHAR(500),
  description TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  response_data JSON,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_product_id (product_id),
  INDEX idx_anymarket_id (anymarket_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar se a tabela foi criada
DESCRIBE anymarket_sync_logs;

-- Mostrar informações sobre a tabela
SHOW CREATE TABLE anymarket_sync_logs;
