-- Script para verificar e corrigir duplicatas na tabela products_vtex
-- Execute este script no seu banco de dados MySQL

-- 1. Verificar se há produtos duplicados por id_produto_vtex
SELECT 
    id_produto_vtex,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id) as duplicate_ids
FROM products_vtex 
GROUP BY id_produto_vtex 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Verificar se há produtos duplicados por ref_produto
SELECT 
    ref_produto,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id) as duplicate_ids
FROM products_vtex 
WHERE ref_produto IS NOT NULL AND ref_produto != ''
GROUP BY ref_produto 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. Verificar se há produtos duplicados por name (nomes idênticos)
SELECT 
    name,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id) as duplicate_ids
FROM products_vtex 
GROUP BY name 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 4. Verificar estrutura da tabela products_vtex
DESCRIBE products_vtex;

-- 5. Verificar índices da tabela products_vtex
SHOW INDEX FROM products_vtex;

-- 6. Contar total de produtos
SELECT COUNT(*) as total_products FROM products_vtex;

-- 7. Contar produtos únicos por id_produto_vtex
SELECT COUNT(DISTINCT id_produto_vtex) as unique_vtex_products FROM products_vtex;

-- 8. Verificar se há produtos com id_produto_vtex NULL ou 0
SELECT COUNT(*) as null_vtex_ids 
FROM products_vtex 
WHERE id_produto_vtex IS NULL OR id_produto_vtex = 0;

-- 9. Verificar se há produtos com ref_produto NULL ou vazio
SELECT COUNT(*) as null_ref_produto 
FROM products_vtex 
WHERE ref_produto IS NULL OR ref_produto = '';

-- 10. Mostrar alguns exemplos de produtos para análise
SELECT 
    id,
    id_produto_vtex,
    ref_produto,
    name,
    created_at
FROM products_vtex 
ORDER BY id 
LIMIT 10;

