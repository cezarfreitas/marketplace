-- Configurar características existentes para camisetas (categoria 16)
-- Primeiro, vamos ver quais características existem
SELECT id, caracteristica, is_active FROM caracteristicas WHERE is_active = 1 ORDER BY caracteristica;

-- Configurar características que podem se aplicar a camisetas
UPDATE caracteristicas 
SET categorias = '16' 
WHERE caracteristica LIKE '%gola%' 
   OR caracteristica LIKE '%manga%' 
   OR caracteristica LIKE '%material%' 
   OR caracteristica LIKE '%cor%' 
   OR caracteristica LIKE '%tamanho%' 
   OR caracteristica LIKE '%estilo%' 
   OR caracteristica LIKE '%gênero%' 
   OR caracteristica LIKE '%ocasião%' 
   OR caracteristica LIKE '%cuidado%'
   OR caracteristica LIKE '%estampa%'
   OR caracteristica LIKE '%decote%'
   OR caracteristica LIKE '%comprimento%'
   AND is_active = 1;

-- Verificar resultado
SELECT id, caracteristica, categorias 
FROM caracteristicas 
WHERE is_active = 1 
  AND (categorias IS NULL OR categorias = '' OR FIND_IN_SET('16', categorias) > 0)
ORDER BY caracteristica;
