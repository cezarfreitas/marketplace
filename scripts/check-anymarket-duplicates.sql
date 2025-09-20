-- Script para verificar duplicatas na tabela anymarket
-- Execute este script no seu banco de dados MySQL

-- 1. Verificar se há registros duplicados por ref_produto_vtex
SELECT 
    ref_produto_vtex,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id) as duplicate_ids,
    GROUP_CONCAT(id_produto_any ORDER BY id) as anymarket_ids
FROM anymarket 
WHERE ref_produto_vtex IS NOT NULL AND ref_produto_vtex != ''
GROUP BY ref_produto_vtex 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Verificar se há registros duplicados por id_produto_any
SELECT 
    id_produto_any,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id) as duplicate_ids,
    GROUP_CONCAT(ref_produto_vtex ORDER BY id) as ref_ids
FROM anymarket 
WHERE id_produto_any IS NOT NULL AND id_produto_any != ''
GROUP BY id_produto_any 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. Verificar estrutura da tabela anymarket
DESCRIBE anymarket;

-- 4. Verificar índices da tabela anymarket
SHOW INDEX FROM anymarket;

-- 5. Contar total de registros
SELECT COUNT(*) as total_records FROM anymarket;

-- 6. Contar registros únicos por ref_produto_vtex
SELECT COUNT(DISTINCT ref_produto_vtex) as unique_ref_produto_vtex 
FROM anymarket 
WHERE ref_produto_vtex IS NOT NULL AND ref_produto_vtex != '';

-- 7. Contar registros únicos por id_produto_any
SELECT COUNT(DISTINCT id_produto_any) as unique_id_produto_any 
FROM anymarket 
WHERE id_produto_any IS NOT NULL AND id_produto_any != '';

-- 8. Verificar se há registros com ref_produto_vtex NULL ou vazio
SELECT COUNT(*) as null_ref_produto_vtex 
FROM anymarket 
WHERE ref_produto_vtex IS NULL OR ref_produto_vtex = '';

-- 9. Verificar se há registros com id_produto_any NULL ou vazio
SELECT COUNT(*) as null_id_produto_any 
FROM anymarket 
WHERE id_produto_any IS NULL OR id_produto_any = '';

-- 10. Mostrar alguns exemplos de registros para análise
SELECT 
    id,
    ref_produto_vtex,
    id_produto_any,
    created_at,
    updated_at
FROM anymarket 
ORDER BY id 
LIMIT 10;

-- 11. Verificar se há inconsistências entre ref_produto_vtex e ref_produto na tabela products_vtex
SELECT 
    a.ref_produto_vtex,
    COUNT(DISTINCT p.id) as products_count,
    GROUP_CONCAT(DISTINCT p.id ORDER BY p.id) as product_ids
FROM anymarket a
LEFT JOIN products_vtex p ON a.ref_produto_vtex = p.ref_produto
WHERE a.ref_produto_vtex IS NOT NULL AND a.ref_produto_vtex != ''
GROUP BY a.ref_produto_vtex
HAVING products_count != 1
ORDER BY products_count DESC;

