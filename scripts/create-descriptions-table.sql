-- Script para criar a tabela descriptions se ela não existir
-- Execute este script no seu banco de dados MySQL

USE seo_db;

-- Criar a tabela descriptions se ela não existir
CREATE TABLE IF NOT EXISTS descriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_product_vtex INT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_id_product_vtex (id_product_vtex),
  INDEX idx_created_at (created_at),
  
  -- Chave única para evitar duplicatas
  UNIQUE KEY unique_product_description (id_product_vtex)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar se a tabela foi criada
DESCRIBE descriptions;

-- Mostrar informações sobre a tabela
SHOW CREATE TABLE descriptions;

-- Verificar se há dados na tabela
SELECT COUNT(*) as total_descriptions FROM descriptions;