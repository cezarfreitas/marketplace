-- Modificar tabela respostas_caracteristicas
-- 1. Adicionar coluna caracteristica (nome da característica)
-- 2. Remover coluna caracteristica_id

-- Primeiro, vamos ver a estrutura atual da tabela
DESCRIBE respostas_caracteristicas;

-- Adicionar coluna caracteristica
ALTER TABLE respostas_caracteristicas 
ADD COLUMN caracteristica VARCHAR(255) NOT NULL COMMENT 'Nome da característica' 
AFTER produto_id;

-- Atualizar a coluna caracteristica com os nomes das características existentes
UPDATE respostas_caracteristicas rc
INNER JOIN caracteristicas c ON rc.caracteristica_id = c.id
SET rc.caracteristica = c.caracteristica;

-- Verificar se a atualização funcionou
SELECT 
  rc.id,
  rc.caracteristica,
  rc.produto_id,
  rc.resposta,
  rc.confianca,
  rc.created_at
FROM respostas_caracteristicas rc
LIMIT 5;

-- Remover a coluna caracteristica_id
ALTER TABLE respostas_caracteristicas 
DROP COLUMN caracteristica_id;

-- Verificar a estrutura final da tabela
DESCRIBE respostas_caracteristicas;

-- Verificar dados finais
SELECT 
  rc.id,
  rc.caracteristica,
  rc.produto_id,
  rc.resposta,
  rc.confianca,
  rc.created_at
FROM respostas_caracteristicas rc
LIMIT 5;
