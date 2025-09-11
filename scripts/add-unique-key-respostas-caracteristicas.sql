-- Adicionar chave única composta para a tabela respostas_caracteristicas
-- Isso permite que o UPSERT funcione corretamente na regeneração

-- Primeiro, verificar se a chave única já existe
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'seo_data' 
    AND TABLE_NAME = 'respostas_caracteristicas' 
    AND CONSTRAINT_NAME LIKE '%unique%';

-- Remover chave única existente se houver (pode ter nome diferente)
-- ALTER TABLE respostas_caracteristicas DROP INDEX IF EXISTS unique_caracteristica_produto;

-- Adicionar nova chave única composta (produto_id + caracteristica)
ALTER TABLE respostas_caracteristicas 
ADD UNIQUE KEY unique_produto_caracteristica (produto_id, caracteristica);

-- Verificar se a chave foi adicionada
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    ORDINAL_POSITION
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'seo_data' 
    AND TABLE_NAME = 'respostas_caracteristicas' 
    AND CONSTRAINT_NAME = 'unique_produto_caracteristica'
ORDER BY ORDINAL_POSITION;
