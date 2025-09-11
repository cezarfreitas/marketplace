-- Adicionar coluna categorias na tabela caracteristicas
ALTER TABLE caracteristicas 
ADD COLUMN categorias TEXT DEFAULT NULL COMMENT 'IDs das categorias separados por vírgula (ex: 1,2,3)';
