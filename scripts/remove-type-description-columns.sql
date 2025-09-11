-- Remover colunas tipo e descricao da tabela caracteristicas
ALTER TABLE caracteristicas DROP COLUMN tipo;
ALTER TABLE caracteristicas DROP COLUMN descricao;

-- Remover o índice único que dependia da coluna tipo
ALTER TABLE caracteristicas DROP INDEX unique_tipo_nome;

-- Adicionar novo índice único apenas para nome
ALTER TABLE caracteristicas ADD UNIQUE KEY unique_nome (nome);
