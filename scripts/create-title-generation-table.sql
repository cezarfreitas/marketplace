-- Script para criar a nova tabela title_generation_logs
-- Esta tabela substitui o uso da tabela agents para geração de títulos

CREATE TABLE IF NOT EXISTS title_generation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  original_title VARCHAR(500),
  generated_title VARCHAR(500),
  generation_method ENUM('ai_agent', 'fallback', 'manual') DEFAULT 'ai_agent',
  agent_config JSON,
  input_data JSON,
  processing_time_ms INT DEFAULT 0,
  attempts_count INT DEFAULT 1,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_product_id (product_id),
  INDEX idx_generation_method (generation_method),
  INDEX idx_success (success),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentário explicativo
-- Esta tabela armazena logs de geração de títulos, substituindo a dependência da tabela agents
-- O agente de geração de título agora está hardcoded no código da aplicação
