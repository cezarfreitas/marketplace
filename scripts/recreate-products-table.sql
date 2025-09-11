-- Script para criar a tabela products_vtex com base no payload padrão da VTEX API
-- Baseado no payload: /api/catalog_system/pvt/products/productgetbyrefid/{refId}

-- Primeiro, fazer backup da tabela atual (opcional)
-- CREATE TABLE products_backup AS SELECT * FROM products;

-- Dropar a tabela atual se existir
DROP TABLE IF EXISTS products_vtex;

-- Criar nova tabela products_vtex com campos do payload VTEX
CREATE TABLE products_vtex (
  -- Campo principal do payload
  vtex_id INT NOT NULL PRIMARY KEY COMMENT 'ID do produto na VTEX (campo Id do payload)',
  
  -- Campos básicos do produto
  name VARCHAR(255) NOT NULL COMMENT 'Nome do produto (campo Name do payload)',
  department_id INT COMMENT 'ID do departamento (campo DepartmentId do payload)',
  category_id INT COMMENT 'ID da categoria (campo CategoryId do payload)',
  brand_id INT COMMENT 'ID da marca (campo BrandId do payload)',
  link_id VARCHAR(255) COMMENT 'Link ID do produto (campo LinkId do payload)',
  ref_id VARCHAR(255) COMMENT 'Referência do produto (campo RefId do payload)',
  
  -- Campos de visibilidade e status
  is_visible BOOLEAN DEFAULT true COMMENT 'Se o produto é visível (campo IsVisible do payload)',
  is_active BOOLEAN DEFAULT true COMMENT 'Se o produto está ativo (campo IsActive do payload)',
  
  -- Campos de descrição
  description TEXT COMMENT 'Descrição completa (campo Description do payload)',
  description_short TEXT COMMENT 'Descrição curta (campo DescriptionShort do payload)',
  title VARCHAR(255) COMMENT 'Título do produto (campo Title do payload)',
  keywords TEXT COMMENT 'Palavras-chave (campo KeyWords do payload)',
  meta_tag_description TEXT COMMENT 'Meta tag description (campo MetaTagDescription do payload)',
  
  -- Campos de data
  release_date DATETIME COMMENT 'Data de lançamento (campo ReleaseDate do payload)',
  
  -- Campos de configuração
  tax_code VARCHAR(50) COMMENT 'Código de imposto (campo TaxCode do payload)',
  supplier_id INT COMMENT 'ID do fornecedor (campo SupplierId do payload)',
  show_without_stock BOOLEAN DEFAULT false COMMENT 'Mostrar sem estoque (campo ShowWithoutStock do payload)',
  
  -- Campos de marketing
  adwords_remarketing_code VARCHAR(255) COMMENT 'Código AdWords Remarketing (campo AdWordsRemarketingCode do payload)',
  lomadee_campaign_code VARCHAR(255) COMMENT 'Código da campanha Lomadee (campo LomadeeCampaignCode do payload)',
  
  -- Campos de controle
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização do registro',
  
  -- Campos adicionais para integração
  anymarket_id VARCHAR(255) COMMENT 'ID do produto no Anymarket (campo adicional)',
  first_image_url VARCHAR(500) COMMENT 'URL da primeira imagem (campo adicional)',
  total_stock INT DEFAULT 0 COMMENT 'Total de estoque (campo adicional)',
  sku_count INT DEFAULT 0 COMMENT 'Quantidade de SKUs (campo adicional)',
  image_count INT DEFAULT 0 COMMENT 'Quantidade de imagens (campo adicional)',
  brand_name VARCHAR(255) COMMENT 'Nome da marca (campo adicional)',
  category_name VARCHAR(255) COMMENT 'Nome da categoria (campo adicional)',
  
  -- Índices
  INDEX idx_name (name),
  INDEX idx_ref_id (ref_id),
  INDEX idx_department_id (department_id),
  INDEX idx_category_id (category_id),
  INDEX idx_brand_id (brand_id),
  INDEX idx_is_visible (is_visible),
  INDEX idx_is_active (is_active),
  INDEX idx_anymarket_id (anymarket_id),
  INDEX idx_created_at (created_at),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de produtos baseada no payload padrão da VTEX API';

-- Inserir dados de exemplo baseado no payload fornecido
INSERT INTO products_vtex (
  vtex_id, name, department_id, category_id, brand_id, link_id, ref_id,
  is_visible, is_active, description, description_short, title, keywords,
  meta_tag_description, release_date, tax_code, supplier_id, show_without_stock,
  adwords_remarketing_code, lomadee_campaign_code
) VALUES (
  203712111,
  'Bermuda Ecko Moletom Cinza Mescla',
  15277,
  15306,
  2000056,
  'Bermuda-Ecko-Moletom-Cinza-Mescla-ECKBERM0220C1',
  'ECKBERM0220C1',
  true,
  true,
  'Aposte no estilo despojado da Bermuda Ecko e componha visuais cheios de atitude.Confeccionada em tecido leve e confortável, garantindo conforto no seu dia a dia.',
  '',
  '',
  'Bermuda Ecko Moletom Cinza Mescla, ECKBERM0220C1, Ecko, Bermudas, U790A',
  'Aposte no estilo despojado da Bermuda Ecko e componha visuais cheios de atitude.Confeccionada em tecido leve e confortável, garantindo conforto no seu dia a dia.',
  '2022-06-29 00:00:00',
  '',
  NULL,
  false,
  NULL,
  NULL
);

-- Verificar a estrutura da tabela
DESCRIBE products_vtex;

-- Verificar os dados inseridos
SELECT * FROM products_vtex WHERE vtex_id = 203712111;
