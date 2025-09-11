-- Adicionar coluna confianca de volta na tabela respostas_caracteristicas
ALTER TABLE respostas_caracteristicas 
ADD COLUMN confianca DECIMAL(3,2) DEFAULT 0.0 COMMENT 'Nível de confiança da resposta (0.0 a 1.0)';
