-- Script para atualizar a estrutura da tabela products_vtex
-- Baseado na estrutura fornecida pelo usuário

-- Verificar se a coluna ref_id existe e renomear para ref_produto
-- Se a coluna ref_id existe, vamos renomeá-la para ref_produto
ALTER TABLE products_vtex CHANGE COLUMN ref_id ref_produto VARCHAR(255) COMMENT 'Reference ID do produto';

-- Verificar se a coluna id existe e renomear para id_produto_vtex
-- Se a coluna id existe, vamos renomeá-la para id_produto_vtex
ALTER TABLE products_vtex CHANGE COLUMN id id_produto_vtex INT NOT NULL AUTO_INCREMENT COMMENT 'ID único do produto VTEX';

-- Verificar se a coluna vtex_id existe e renomear para id_produto_vtex
-- Se a coluna vtex_id existe, vamos renomeá-la para id_produto_vtex
ALTER TABLE products_vtex CHANGE COLUMN vtex_id id_produto_vtex INT NOT NULL AUTO_INCREMENT COMMENT 'ID único do produto VTEX';

-- Verificar a estrutura atual da tabela
DESCRIBE products_vtex;

-- Exemplo de consulta com a nova estrutura
SELECT 
  id_produto_vtex,
  name,
  department_id,
  category_id,
  brand_id,
  link_id,
  ref_produto,
  is_visible,
  description,
  description_short,
  release_date,
  keywords,
  title,
  is_active,
  tax_code,
  meta_tag_description,
  supplier_id,
  show_without_stock,
  list_store_id,
  adwords_remarketing_code,
  lomadee_campaign_code,
  created_at,
  updated_at
FROM products_vtex 
LIMIT 5;
