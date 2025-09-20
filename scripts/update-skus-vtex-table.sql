-- Script para atualizar a estrutura da tabela skus_vtex
-- Baseado na estrutura fornecida pelo usuário

-- Verificar se a coluna ref_id existe e renomear para ref_sku
-- Se a coluna ref_id existe, vamos renomeá-la para ref_sku
ALTER TABLE skus_vtex CHANGE COLUMN ref_id ref_sku VARCHAR(255) COMMENT 'Reference ID do SKU';

-- Verificar se a coluna id existe e renomear para id_sku_vtex
-- Se a coluna id existe, vamos renomeá-la para id_sku_vtex
ALTER TABLE skus_vtex CHANGE COLUMN id id_sku_vtex INT NOT NULL AUTO_INCREMENT COMMENT 'ID único do SKU VTEX';

-- Verificar se a coluna product_id existe e renomear para id_produto_vtex
-- Se a coluna product_id existe, vamos renomeá-la para id_produto_vtex
ALTER TABLE skus_vtex CHANGE COLUMN product_id id_produto_vtex INT NOT NULL COMMENT 'ID do produto VTEX';

-- Verificar a estrutura atual da tabela
DESCRIBE skus_vtex;

-- Exemplo de consulta com a nova estrutura
SELECT 
  id_sku_vtex,
  id_produto_vtex,
  is_active,
  name,
  ref_sku,
  date_updated,
  created_at,
  updated_at
FROM skus_vtex 
LIMIT 5;
