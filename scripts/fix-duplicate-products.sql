-- Script para corrigir duplicatas na tabela products_vtex
-- ATENÇÃO: Execute este script com cuidado e faça backup antes!

-- 1. Criar tabela temporária para armazenar IDs dos produtos duplicados
CREATE TEMPORARY TABLE temp_duplicates AS
SELECT 
    id_produto_vtex,
    MIN(id) as keep_id,
    GROUP_CONCAT(id ORDER BY id) as all_ids
FROM products_vtex 
GROUP BY id_produto_vtex 
HAVING COUNT(*) > 1;

-- 2. Mostrar quais produtos serão afetados
SELECT 
    id_produto_vtex,
    keep_id,
    all_ids,
    (LENGTH(all_ids) - LENGTH(REPLACE(all_ids, ',', '')) + 1) as total_duplicates
FROM temp_duplicates
ORDER BY total_duplicates DESC;

-- 3. Verificar se há registros relacionados nas tabelas filhas antes de deletar
-- (Descomente as linhas abaixo se necessário)

-- Verificar SKUs relacionados
-- SELECT COUNT(*) as skus_to_cleanup
-- FROM skus_vtex s
-- INNER JOIN temp_duplicates t ON s.id_produto_vtex = t.id_produto_vtex
-- WHERE s.id_produto_vtex NOT IN (SELECT keep_id FROM temp_duplicates);

-- Verificar imagens relacionadas
-- SELECT COUNT(*) as images_to_cleanup
-- FROM images_vtex i
-- INNER JOIN skus_vtex s ON i.id_sku_vtex = s.id_sku_vtex
-- INNER JOIN temp_duplicates t ON s.id_produto_vtex = t.id_produto_vtex
-- WHERE s.id_produto_vtex NOT IN (SELECT keep_id FROM temp_duplicates);

-- 4. ATENÇÃO: Descomente as linhas abaixo apenas se você tem certeza que quer deletar os duplicados
-- Isso irá deletar os registros duplicados, mantendo apenas o primeiro (menor ID)

-- Deletar SKUs dos produtos duplicados (exceto o que será mantido)
-- DELETE s FROM skus_vtex s
-- INNER JOIN temp_duplicates t ON s.id_produto_vtex = t.id_produto_vtex
-- WHERE s.id_produto_vtex NOT IN (SELECT keep_id FROM temp_duplicates);

-- Deletar imagens dos SKUs dos produtos duplicados
-- DELETE i FROM images_vtex i
-- INNER JOIN skus_vtex s ON i.id_sku_vtex = s.id_sku_vtex
-- INNER JOIN temp_duplicates t ON s.id_produto_vtex = t.id_produto_vtex
-- WHERE s.id_produto_vtex NOT IN (SELECT keep_id FROM temp_duplicates);

-- Deletar registros relacionados em outras tabelas (se existirem)
-- DELETE FROM anymarket WHERE id_produto_vtex IN (
--     SELECT id_produto_vtex FROM temp_duplicates 
--     WHERE id_produto_vtex NOT IN (SELECT keep_id FROM temp_duplicates)
-- );

-- Deletar os produtos duplicados (exceto o que será mantido)
-- DELETE p FROM products_vtex p
-- INNER JOIN temp_duplicates t ON p.id_produto_vtex = t.id_produto_vtex
-- WHERE p.id NOT IN (SELECT keep_id FROM temp_duplicates);

-- 5. Verificar se a limpeza foi bem-sucedida
-- SELECT COUNT(*) as remaining_products FROM products_vtex;
-- SELECT COUNT(DISTINCT id_produto_vtex) as unique_vtex_products FROM products_vtex;

-- 6. Limpar tabela temporária
DROP TEMPORARY TABLE temp_duplicates;

