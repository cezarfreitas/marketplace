-- Script para corrigir a tabela titles adicionando a coluna id se não existir
-- Execute este script diretamente no banco de dados MySQL

-- Verificar se a coluna id existe, se não, adicionar
ALTER TABLE titles 
ADD COLUMN IF NOT EXISTS id INT AUTO_INCREMENT PRIMARY KEY FIRST;

-- Se a tabela não existir, criar com a estrutura correta
CREATE TABLE IF NOT EXISTS titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_product_vtex INT NOT NULL, 
  title VARCHAR(500) NOT NULL,
  original_title VARCHAR(500),
  openai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
  openai_tokens_used INT DEFAULT 0,
  openai_tokens_prompt INT DEFAULT 0,
  openai_tokens_completion INT DEFAULT 0,
  openai_cost DECIMAL(10,6) DEFAULT 0.000000,
  openai_request_id VARCHAR(255),
  openai_response_time_ms INT DEFAULT 0,
  openai_max_tokens INT DEFAULT 100,
  openai_temperature DECIMAL(3,2) DEFAULT 0.30,
  generation_attempts INT DEFAULT 1,
  is_unique BOOLEAN DEFAULT TRUE,
  validation_passed BOOLEAN DEFAULT TRUE,
  status ENUM('pending', 'validated', 'error') DEFAULT 'validated',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_product_title (id_product_vtex),
  INDEX idx_product_id (id_product_vtex),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
