-- Script para atualizar a estrutura da tabela brands_vtex
-- Baseado na estrutura fornecida pelo usuário

-- Verificar se a coluna id existe e renomear para id_brand_vtex
-- Se a coluna id existe, vamos renomeá-la para id_brand_vtex
ALTER TABLE brands_vtex CHANGE COLUMN id id_brand_vtex INT NOT NULL COMMENT 'ID único da marca VTEX';

-- Verificar se a coluna vtex_id existe e renomear para id_brand_vtex
-- Se a coluna vtex_id existe, vamos renomeá-la para id_brand_vtex
ALTER TABLE brands_vtex CHANGE COLUMN vtex_id id_brand_vtex INT NOT NULL COMMENT 'ID único da marca VTEX';

-- Verificar se a coluna contexto existe, se não existir, adicionar
-- Se a coluna contexto não existe, vamos adicioná-la
ALTER TABLE brands_vtex ADD COLUMN contexto TEXT COMMENT 'Contexto da marca';

-- Verificar a estrutura atual da tabela
DESCRIBE brands_vtex;

-- Exemplo de consulta com a nova estrutura
SELECT 
  id_brand_vtex,
  name,
  is_active,
  title,
  meta_tag_description,
  image_url,
  contexto,
  created_at,
  updated_at
FROM brands_vtex 
LIMIT 5;
