-- Script para testar a query de características usada na API
-- Substitua o valor do produto_id pelo ID do produto que você quer testar

-- 1. Definir o ID do produto para teste
SET @produto_id = 123; -- SUBSTITUA pelo ID do produto que você quer testar

-- 2. Executar a query exata usada na API
SELECT 
    rc.caracteristica,
    rc.resposta
FROM respostas_caracteristicas rc
WHERE rc.produto_id = @produto_id 
  AND rc.resposta IS NOT NULL 
  AND rc.resposta != ''
  AND TRIM(rc.resposta) != ''
ORDER BY rc.caracteristica ASC;

-- 3. Verificar se há registros na tabela respostas_caracteristicas para este produto
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN resposta IS NOT NULL THEN 1 END) as com_resposta,
    COUNT(CASE WHEN resposta IS NOT NULL AND resposta != '' THEN 1 END) as com_resposta_nao_vazia,
    COUNT(CASE WHEN resposta IS NOT NULL AND resposta != '' AND TRIM(resposta) != '' THEN 1 END) as com_resposta_valida
FROM respostas_caracteristicas 
WHERE produto_id = @produto_id;

-- 4. Mostrar todos os registros do produto (incluindo os que não passam no filtro)
SELECT 
    id,
    caracteristica,
    resposta,
    CASE 
        WHEN resposta IS NULL THEN 'NULL'
        WHEN resposta = '' THEN 'VAZIO'
        WHEN TRIM(resposta) = '' THEN 'APENAS_ESPACOS'
        ELSE 'VALIDA'
    END as status_resposta
FROM respostas_caracteristicas 
WHERE produto_id = @produto_id
ORDER BY caracteristica ASC;

-- 5. Verificar se o produto existe
SELECT 
    id,
    id_produto_vtex,
    name,
    ref_produto
FROM products_vtex 
WHERE id = @produto_id;

-- 6. Verificar se há características ativas na tabela caracteristicas
SELECT 
    caracteristica,
    tipo,
    is_active
FROM caracteristicas 
WHERE is_active = TRUE
ORDER BY caracteristica ASC;

