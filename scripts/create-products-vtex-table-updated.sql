-- Script para criar/atualizar a tabela products_vtex com a estrutura correta
-- Baseado na estrutura fornecida pelo usuário

-- Dropar a tabela se existir (CUIDADO: isso apagará todos os dados!)
-- DROP TABLE IF EXISTS products_vtex;

-- Criar a tabela products_vtex com a estrutura correta
CREATE TABLE IF NOT EXISTS products_vtex (
  id_produto_vtex INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'ID único do produto VTEX',
  name VARCHAR(255) NOT NULL COMMENT 'Nome do produto',
  department_id INT COMMENT 'ID do departamento',
  category_id INT COMMENT 'ID da categoria',
  brand_id INT COMMENT 'ID da marca',
  link_id VARCHAR(255) COMMENT 'Link ID do produto',
  ref_id VARCHAR(255) COMMENT 'Referência do produto',
  is_visible BOOLEAN DEFAULT true COMMENT 'Se o produto é visível',
  description TEXT COMMENT 'Descrição completa',
  description_short TEXT COMMENT 'Descrição curta',
  release_date DATETIME COMMENT 'Data de lançamento',
  keywords TEXT COMMENT 'Palavras-chave',
  title VARCHAR(255) COMMENT 'Título do produto',
  is_active BOOLEAN DEFAULT true COMMENT 'Se o produto está ativo',
  tax_code VARCHAR(50) COMMENT 'Código de imposto',
  meta_tag_description TEXT COMMENT 'Meta tag description',
  supplier_id INT COMMENT 'ID do fornecedor',
  show_without_stock BOOLEAN DEFAULT false COMMENT 'Mostrar sem estoque',
  list_store_id INT COMMENT 'ID da loja na lista',
  adwords_remarketing_code VARCHAR(255) COMMENT 'Código AdWords Remarketing',
  lomadee_campaign_code VARCHAR(255) COMMENT 'Código da campanha Lomadee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  
  -- Índices para performance
  INDEX idx_name (name),
  INDEX idx_ref_id (ref_id),
  INDEX idx_department_id (department_id),
  INDEX idx_category_id (category_id),
  INDEX idx_brand_id (brand_id),
  INDEX idx_is_visible (is_visible),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de produtos VTEX com estrutura atualizada';

-- Verificar a estrutura criada
DESCRIBE products_vtex;

-- Exemplo de inserção de dados
INSERT INTO products_vtex (
  name, department_id, category_id, brand_id, link_id, ref_id,
  is_visible, is_active, description, description_short, title, keywords,
  meta_tag_description, release_date, tax_code, supplier_id, show_without_stock,
  list_store_id, adwords_remarketing_code, lomadee_campaign_code
) VALUES (
  'Bermuda Ecko Moletom Cinza Mescla',
  15277,
  15306,
  2000056,
  'Bermuda-Ecko-Moletom-Cinza-Mescla-ECKBERM0220C1',
  'ECKBERM0220C1',
  true,
  true,
  'Aposte no estilo despojado da Bermuda Ecko e componha visuais cheios de atitude. Confeccionada em tecido leve e confortável, garantindo conforto no seu dia a dia.',
  '',
  'Bermuda Ecko Moletom Cinza Mescla',
  'Bermuda Ecko Moletom Cinza Mescla, ECKBERM0220C1, Ecko, Bermudas, U790A',
  'Aposte no estilo despojado da Bermuda Ecko e componha visuais cheios de atitude. Confeccionada em tecido leve e confortável, garantindo conforto no seu dia a dia.',
  '2022-06-29 00:00:00',
  '',
  NULL,
  false,
  NULL,
  NULL,
  NULL
) ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  updated_at = CURRENT_TIMESTAMP;

-- Verificar dados inseridos
SELECT 
  id_produto_vtex,
  name,
  ref_id,
  is_visible,
  is_active,
  created_at,
  updated_at
FROM products_vtex 
WHERE ref_id = 'ECKBERM0220C1';
