-- Script para atualizar a estrutura da tabela categories_vtex
-- Baseado na estrutura fornecida pelo usuário

-- Verificar se a coluna id existe e renomear para id_categories_vtex
-- Se a coluna id existe, vamos renomeá-la para id_categories_vtex
ALTER TABLE categories_vtex CHANGE COLUMN id id_categories_vtex INT NOT NULL COMMENT 'ID único da categoria VTEX';

-- Verificar se a coluna vtex_id existe e renomear para id_categories_vtex
-- Se a coluna vtex_id existe, vamos renomeá-la para id_categories_vtex
ALTER TABLE categories_vtex CHANGE COLUMN vtex_id id_categories_vtex INT NOT NULL COMMENT 'ID único da categoria VTEX';

-- Verificar se a coluna contexto existe, se não existir, adicionar
-- Se a coluna contexto não existe, vamos adicioná-la
ALTER TABLE categories_vtex ADD COLUMN contexto TEXT COMMENT 'Contexto da categoria';

-- Verificar se a coluna has_children existe, se não existir, adicionar
-- Se a coluna has_children não existe, vamos adicioná-la
ALTER TABLE categories_vtex ADD COLUMN has_children BOOLEAN DEFAULT false COMMENT 'Se a categoria tem filhos';

-- Verificar a estrutura atual da tabela
DESCRIBE categories_vtex;

-- Exemplo de consulta com a nova estrutura
SELECT 
  id_categories_vtex,
  name,
  father_category_id,
  title,
  description,
  keywords,
  is_active,
  show_in_store_front,
  has_children,
  contexto,
  created_at,
  updated_at
FROM categories_vtex 
LIMIT 5;
