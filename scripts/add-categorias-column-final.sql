-- Adicionar coluna categorias na tabela caracteristicas
-- Este script adiciona a coluna que estava faltando para armazenar os IDs das categorias

ALTER TABLE caracteristicas 
ADD COLUMN categorias TEXT DEFAULT NULL COMMENT 'IDs das categorias separados por vírgula (ex: 1,2,3)';

-- Verificar se a coluna foi criada
DESCRIBE caracteristicas;