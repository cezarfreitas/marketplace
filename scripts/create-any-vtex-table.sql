-- Script para criar a tabela any_vtex
-- Banco: meli

-- Tabela para vincular IDs do Anymarket com REF_IDs da VTEX
CREATE TABLE IF NOT EXISTS any_vtex (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_any VARCHAR(255) NOT NULL COMMENT 'ID do produto no Anymarket',
    ref_id VARCHAR(255) NOT NULL COMMENT 'REF_ID do produto na VTEX',
    product_name VARCHAR(500) COMMENT 'Nome do produto (opcional)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização do registro',
    
    -- Índices
    UNIQUE KEY unique_id_any (id_any),
    INDEX idx_ref_id (ref_id),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela para vincular IDs do Anymarket com REF_IDs da VTEX';
