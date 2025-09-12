-- Script simplificado para criar tabela de títulos
CREATE TABLE IF NOT EXISTS titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  original_title VARCHAR(255) DEFAULT NULL,
  agent_id INT DEFAULT NULL,
  openai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
  openai_tokens_used INT DEFAULT 0,
  openai_tokens_prompt INT DEFAULT 0,
  openai_tokens_completion INT DEFAULT 0,
  openai_cost DECIMAL(10, 6) DEFAULT 0.000000,
  openai_request_id VARCHAR(255) DEFAULT NULL,
  openai_response_time_ms INT DEFAULT 0,
  openai_max_tokens INT DEFAULT 100,
  openai_temperature DECIMAL(3, 2) DEFAULT 0.30,
  generation_attempts INT DEFAULT 1,
  is_unique BOOLEAN DEFAULT TRUE,
  validation_passed BOOLEAN DEFAULT TRUE,
  status ENUM('generated', 'validated', 'failed') DEFAULT 'generated',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_product_id (product_id),
  INDEX idx_title (title),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  
  UNIQUE KEY unique_active_title (product_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
