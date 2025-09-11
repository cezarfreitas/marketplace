-- Renomear coluna 'nome' para 'caracteristica' na tabela caracteristicas
ALTER TABLE caracteristicas CHANGE COLUMN nome caracteristica VARCHAR(255) NOT NULL COMMENT 'Nome da característica (ex: Cor Principal, Tipo de Manga)';

-- Atualizar o índice único para usar o novo nome da coluna
ALTER TABLE caracteristicas DROP INDEX unique_nome;
ALTER TABLE caracteristicas ADD UNIQUE KEY unique_caracteristica (caracteristica);
