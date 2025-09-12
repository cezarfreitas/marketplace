-- Script para criar tabela dedicada aos títulos gerados
-- Execute este script no banco de dados MySQL

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
  
  -- Índices para performance
  INDEX idx_product_id (product_id),
  INDEX idx_title (title),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_agent_id (agent_id),
  
  -- Chave estrangeira para produtos
  FOREIGN KEY (product_id) REFERENCES products_vtex(id) ON DELETE CASCADE,
  
  -- Chave estrangeira para agentes (opcional)
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  
  -- Índice único para garantir que cada produto tenha apenas um título ativo
  UNIQUE KEY unique_active_title (product_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentários para documentação
ALTER TABLE titles COMMENT = 'Tabela dedicada para armazenar títulos gerados por IA para produtos';

-- Adicionar comentários nas colunas principais
ALTER TABLE titles MODIFY COLUMN product_id INT NOT NULL COMMENT 'ID do produto na tabela products_vtex';
ALTER TABLE titles MODIFY COLUMN title VARCHAR(255) NOT NULL COMMENT 'Título gerado pela IA (máximo 60 caracteres)';
ALTER TABLE titles MODIFY COLUMN original_title VARCHAR(255) DEFAULT NULL COMMENT 'Título original do produto antes da geração';
ALTER TABLE titles MODIFY COLUMN agent_id INT DEFAULT NULL COMMENT 'ID do agente usado para gerar o título';
ALTER TABLE titles MODIFY COLUMN generation_attempts INT DEFAULT 1 COMMENT 'Número de tentativas para gerar um título válido';
ALTER TABLE titles MODIFY COLUMN is_unique BOOLEAN DEFAULT TRUE COMMENT 'Se o título é único no banco de dados';
ALTER TABLE titles MODIFY COLUMN validation_passed BOOLEAN DEFAULT TRUE COMMENT 'Se o título passou na validação de 60 caracteres';
ALTER TABLE titles MODIFY COLUMN status ENUM('generated', 'validated', 'failed') DEFAULT 'generated' COMMENT 'Status do título: generated, validated, failed';

-- Inserir dados de exemplo (opcional - remover em produção)
-- INSERT INTO titles (product_id, title, original_title, status) VALUES 
-- (1, 'Camiseta Nike Masculino Azul Premium Estilo Urbano', 'Camiseta Nike Azul', 'validated'),
-- (2, 'Moletom Adidas Feminino Preto Confortável Casual', 'Moletom Adidas Preto', 'validated');

-- Verificar se a tabela foi criada corretamente
SELECT 
  TABLE_NAME,
  TABLE_COMMENT,
  ENGINE,
  TABLE_COLLATION
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'titles';

-- Verificar estrutura da tabela
DESCRIBE titles;
