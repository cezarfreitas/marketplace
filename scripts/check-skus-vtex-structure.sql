-- Script para verificar a estrutura atual da tabela skus_vtex
-- Execute este script para entender quais colunas existem

-- 1. Verificar estrutura da tabela skus_vtex
DESCRIBE skus_vtex;

-- 2. Verificar se a tabela existe
SHOW TABLES LIKE 'skus_vtex';

-- 3. Verificar índices da tabela
SHOW INDEX FROM skus_vtex;

-- 4. Contar registros na tabela
SELECT COUNT(*) as total_skus FROM skus_vtex;

-- 5. Mostrar alguns exemplos de registros
SELECT * FROM skus_vtex LIMIT 5;

-- 6. Verificar se há registros para o produto específico (substitua 203721561 pelo ID desejado)
SELECT * FROM skus_vtex WHERE id_produto_vtex = 203721561 LIMIT 10;

-- 7. Verificar estrutura da tabela products_vtex também
DESCRIBE products_vtex;

-- 8. Verificar se o produto existe
SELECT * FROM products_vtex WHERE id_produto_vtex = 203721561;
