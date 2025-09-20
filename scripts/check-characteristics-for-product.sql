-- Script para verificar características de um produto específico
-- Substitua o valor do produto_id pelo ID do produto que você quer verificar

-- 1. Verificar se há características para um produto específico
-- SUBSTITUA 123 pelo ID do produto que você quer verificar
SET @produto_id = 123;

-- 2. Verificar estrutura da tabela respostas_caracteristicas
DESCRIBE respostas_caracteristicas;

-- 3. Verificar se há registros para o produto
SELECT 
    COUNT(*) as total_caracteristicas,
    COUNT(CASE WHEN resposta IS NOT NULL AND resposta != '' AND TRIM(resposta) != '' THEN 1 END) as caracteristicas_com_resposta
FROM respostas_caracteristicas 
WHERE produto_id = @produto_id;

-- 4. Mostrar todas as características do produto
SELECT 
    id,
    caracteristica,
    resposta,
    confianca,
    created_at
FROM respostas_caracteristicas 
WHERE produto_id = @produto_id
ORDER BY caracteristica ASC;

-- 5. Verificar se há características ativas na tabela caracteristicas
SELECT 
    COUNT(*) as total_caracteristicas_ativas
FROM caracteristicas 
WHERE is_active = TRUE;

-- 6. Mostrar algumas características ativas
SELECT 
    id,
    caracteristica,
    tipo,
    is_active
FROM caracteristicas 
WHERE is_active = TRUE
LIMIT 10;

-- 7. Verificar se há produtos com características
SELECT 
    COUNT(DISTINCT produto_id) as produtos_com_caracteristicas,
    COUNT(*) as total_respostas
FROM respostas_caracteristicas;

-- 8. Mostrar alguns produtos com características
SELECT 
    produto_id,
    COUNT(*) as total_caracteristicas
FROM respostas_caracteristicas 
GROUP BY produto_id
ORDER BY total_caracteristicas DESC
LIMIT 10;

-- 9. Verificar se o produto específico existe na tabela products_vtex
SELECT 
    id,
    id_produto_vtex,
    name,
    ref_produto
FROM products_vtex 
WHERE id = @produto_id;

-- 10. Verificar se há inconsistências entre as tabelas
SELECT 
    p.id as product_id,
    p.id_produto_vtex,
    p.name,
    COUNT(rc.id) as caracteristicas_count
FROM products_vtex p
LEFT JOIN respostas_caracteristicas rc ON p.id = rc.produto_id
WHERE p.id = @produto_id
GROUP BY p.id, p.id_produto_vtex, p.name;

