-- Adicionar coluna categorias na tabela caracteristicas
ALTER TABLE caracteristicas 
ADD COLUMN categorias TEXT DEFAULT NULL COMMENT 'IDs das categorias separados por vírgula (ex: 1,2,3)';

-- Configurar características típicas para camisetas (categoria 16)
UPDATE caracteristicas 
SET categorias = '16' 
WHERE caracteristica IN (
  'Tipo de Gola',
  'Tipo de Manga', 
  'Tipo de Estampa',
  'Material',
  'Tamanho',
  'Cor',
  'Estilo',
  'Gênero',
  'Ocasião',
  'Cuidados'
) AND is_active = 1;

-- Verificar resultado
SELECT id, caracteristica, categorias 
FROM caracteristicas 
WHERE is_active = 1 
  AND (categorias IS NULL OR categorias = '' OR FIND_IN_SET('16', categorias) > 0)
ORDER BY caracteristica;
