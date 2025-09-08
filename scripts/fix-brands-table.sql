-- Script simples para corrigir a tabela de marcas
-- Banco: meli

-- Dropar a tabela atual
DROP TABLE IF EXISTS brands;

-- Criar nova tabela de marcas baseada no JSON da API VTEX
CREATE TABLE brands (
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
