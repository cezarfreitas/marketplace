-- Script simples para criar apenas as tabelas necessárias
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

-- Tabela de marcas (estrutura limpa baseada no JSON da API VTEX)
CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vtex_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    title VARCHAR(255),
    meta_tag_description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vtex_id (vtex_id),
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configurações padrão
INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
('vtex_account_name', '', 'Nome da conta VTEX'),
('vtex_environment', 'vtexcommercestable', 'Ambiente da API VTEX (vtexcommercestable ou vtexcommercestable)'),
('vtex_app_key', '', 'App Key da API VTEX'),
('vtex_app_token', '', 'App Token da API VTEX'),
('openai_api_key', '', 'Chave da API da OpenAI para funcionalidades de IA');
