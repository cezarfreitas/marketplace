-- Remover colunas da tabela respostas_caracteristicas
-- 1. Remover coluna analise_imagem_id
-- 2. Remover coluna confianca

-- Verificar estrutura atual da tabela
DESCRIBE respostas_caracteristicas;

-- Remover coluna analise_imagem_id
ALTER TABLE respostas_caracteristicas 
DROP COLUMN analise_imagem_id;

-- Remover coluna confianca
ALTER TABLE respostas_caracteristicas 
DROP COLUMN confianca;

-- Verificar estrutura final da tabela
DESCRIBE respostas_caracteristicas;

-- Verificar dados finais
SELECT 
  id,
  caracteristica,
  produto_id,
  resposta,
  tokens_usados,
  created_at,
  updated_at
FROM respostas_caracteristicas
LIMIT 5;
