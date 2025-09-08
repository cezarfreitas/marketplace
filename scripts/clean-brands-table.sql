-- Script para limpar a tabela de marcas removendo colunas não utilizadas
-- Baseado no JSON da API VTEX

-- Dropar a tabela atual
DROP TABLE IF EXISTS brands;

-- Criar tabela limpa apenas com os campos do JSON VTEX
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

-- Comentários sobre os campos mantidos:
-- id: Chave primária auto-incremento (necessário para o sistema)
-- vtex_id: ID da marca na VTEX (campo "id" do JSON)
-- name: Nome da marca (campo "name" do JSON)
-- is_active: Status ativo/inativo (campo "isActive" do JSON)
-- title: Título da marca (campo "title" do JSON)
-- meta_tag_description: Descrição para meta tags (campo "metaTagDescription" do JSON)
-- image_url: URL da imagem (campo "imageUrl" do JSON)
-- created_at: Data de criação (controle interno)
-- updated_at: Data de atualização (controle interno)

-- Campos removidos (não existem no JSON da API VTEX):
-- text, keywords, site_title, menu_home, adwords_remarketing_code, 
-- lomadee_campaign_code, score, link_id
