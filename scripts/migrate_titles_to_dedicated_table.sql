-- Script para migrar títulos existentes da tabela marketplace para a nova tabela titles
-- Execute este script no banco de dados MySQL APÓS criar a tabela titles

-- 1. Verificar se existem títulos na tabela marketplace
SELECT 
  COUNT(*) as total_titles,
  COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as valid_titles
FROM marketplace;

-- 2. Migrar títulos existentes da tabela marketplace para a nova tabela titles
INSERT INTO titles (
  product_id,
  title,
  original_title,
  agent_id,
  openai_model,
  openai_tokens_used,
  openai_tokens_prompt,
  openai_tokens_completion,
  openai_cost,
  openai_request_id,
  openai_response_time_ms,
  openai_max_tokens,
  openai_temperature,
  generation_attempts,
  is_unique,
  validation_passed,
  status,
  created_at,
  updated_at
)
SELECT 
  m.product_id,
  m.title,
  p.title as original_title, -- Título original do produto
  NULL as agent_id, -- Não temos informação do agente na tabela marketplace
  m.openai_model,
  m.openai_tokens_used,
  m.openai_tokens_prompt,
  m.openai_tokens_completion,
  m.openai_cost,
  m.openai_request_id,
  m.openai_response_time_ms,
  m.openai_max_tokens,
  m.openai_temperature,
  1 as generation_attempts, -- Assumir 1 tentativa
  TRUE as is_unique, -- Assumir que são únicos
  CASE 
    WHEN LENGTH(m.title) <= 60 THEN TRUE 
    ELSE FALSE 
  END as validation_passed,
  'validated' as status,
  m.generated_at as created_at,
  m.updated_at
FROM marketplace m
LEFT JOIN products_vtex p ON m.product_id = p.id
WHERE m.title IS NOT NULL 
  AND m.title != ''
  AND NOT EXISTS (
    SELECT 1 FROM titles t 
    WHERE t.product_id = m.product_id 
      AND t.status = 'validated'
  );

-- 3. Verificar quantos títulos foram migrados
SELECT 
  COUNT(*) as migrated_titles,
  COUNT(CASE WHEN validation_passed = TRUE THEN 1 END) as valid_titles,
  COUNT(CASE WHEN validation_passed = FALSE THEN 1 END) as invalid_titles
FROM titles;

-- 4. Verificar títulos que não passaram na validação (mais de 60 caracteres)
SELECT 
  id,
  product_id,
  title,
  LENGTH(title) as title_length,
  validation_passed
FROM titles 
WHERE validation_passed = FALSE
ORDER BY LENGTH(title) DESC;

-- 5. Atualizar títulos que excedem 60 caracteres (truncar inteligentemente)
UPDATE titles 
SET 
  title = CASE 
    WHEN LENGTH(title) > 60 THEN 
      SUBSTRING(title, 1, LOCATE(' ', CONCAT(SUBSTRING(title, 1, 60), ' ')) - 1)
    ELSE title 
  END,
  validation_passed = TRUE,
  updated_at = NOW()
WHERE validation_passed = FALSE 
  AND LENGTH(title) > 60;

-- 6. Verificar se ainda existem títulos inválidos
SELECT 
  COUNT(*) as remaining_invalid_titles
FROM titles 
WHERE validation_passed = FALSE;

-- 7. Mostrar estatísticas finais
SELECT 
  'Títulos na tabela marketplace' as source,
  COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as count
FROM marketplace
UNION ALL
SELECT 
  'Títulos na tabela titles' as source,
  COUNT(*) as count
FROM titles
UNION ALL
SELECT 
  'Títulos válidos (≤60 chars)' as source,
  COUNT(CASE WHEN LENGTH(title) <= 60 THEN 1 END) as count
FROM titles
UNION ALL
SELECT 
  'Títulos inválidos (>60 chars)' as source,
  COUNT(CASE WHEN LENGTH(title) > 60 THEN 1 END) as count
FROM titles;

-- 8. Opcional: Remover títulos da tabela marketplace após migração bem-sucedida
-- ATENÇÃO: Execute apenas se a migração foi bem-sucedida e você quer limpar a tabela marketplace
-- UPDATE marketplace SET title = NULL WHERE title IS NOT NULL AND title != '';

-- 9. Verificar integridade dos dados migrados
SELECT 
  t.product_id,
  p.name as product_name,
  t.title,
  t.original_title,
  LENGTH(t.title) as title_length,
  t.validation_passed,
  t.status,
  t.created_at
FROM titles t
LEFT JOIN products_vtex p ON t.product_id = p.id
ORDER BY t.created_at DESC
LIMIT 10;
