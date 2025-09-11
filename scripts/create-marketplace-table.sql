-- Script para criar a tabela marketplace
-- Esta tabela armazenará títulos e descrições gerados para marketplace
-- junto com os logs da OpenAI para auditoria

-- Criar tabela marketplace
CREATE TABLE IF NOT EXISTS marketplace (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL COMMENT 'ID do produto na tabela products_vtex',
    title VARCHAR(500) NOT NULL COMMENT 'Título gerado para marketplace',
    description TEXT NOT NULL COMMENT 'Descrição gerada para marketplace',
    
    -- Campos para logs da OpenAI
    openai_model VARCHAR(100) DEFAULT 'gpt-3.5-turbo' COMMENT 'Modelo da OpenAI usado',
    openai_tokens_used INT DEFAULT 0 COMMENT 'Número de tokens utilizados',
    openai_tokens_prompt INT DEFAULT 0 COMMENT 'Tokens do prompt',
    openai_tokens_completion INT DEFAULT 0 COMMENT 'Tokens da resposta',
    openai_cost DECIMAL(10,6) DEFAULT 0.00 COMMENT 'Custo da requisição em USD',
    openai_request_id VARCHAR(255) COMMENT 'ID da requisição da OpenAI',
    openai_response_time_ms INT DEFAULT 0 COMMENT 'Tempo de resposta em milissegundos',
    
    -- Campos de controle
    status ENUM('pending', 'generated', 'error') DEFAULT 'pending' COMMENT 'Status da geração',
    error_message TEXT COMMENT 'Mensagem de erro se houver',
    generated_at TIMESTAMP NULL COMMENT 'Data/hora da geração',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
    
    -- Índices para melhor performance
    INDEX idx_product_id (product_id),
    INDEX idx_status (status),
    INDEX idx_generated_at (generated_at),
    INDEX idx_created_at (created_at),
    
    -- Chave única para evitar duplicatas por produto
    UNIQUE KEY unique_product_marketplace (product_id),
    
    -- Foreign key para products_vtex
    FOREIGN KEY (product_id) REFERENCES products_vtex(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela para armazenar descrições de marketplace geradas pela OpenAI';

-- Inserir dados de exemplo (opcional)
-- INSERT INTO marketplace (product_id, title, description, status, generated_at) VALUES
-- (1, 'Título de Exemplo', 'Descrição de exemplo para marketplace', 'generated', NOW());
