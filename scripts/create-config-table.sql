-- Script para criar apenas a tabela de configurações VTEX
-- Banco: meli

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configurações padrão
INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
('vtex_account_name', '', 'Nome da conta VTEX'),
('vtex_environment', 'vtexcommercestable', 'Ambiente da API VTEX (vtexcommercestable ou vtexcommercestable)'),
('vtex_app_key', '', 'App Key da API VTEX'),
('vtex_app_token', '', 'App Token da API VTEX'),
('vtex_base_url', '', 'URL base da API VTEX');
