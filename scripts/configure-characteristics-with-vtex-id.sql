-- Script para configurar características usando vtex_id da tabela categories_vtex

-- 1. Primeiro, vamos verificar qual é o vtex_id da categoria de camisetas
SELECT id, vtex_id, name, is_active 
FROM categories_vtex 
WHERE id = 16 OR name LIKE '%camiseta%' OR name LIKE '%t-shirt%' OR name LIKE '%shirt%'
ORDER BY id;

-- 2. Adicionar coluna categorias se não existir
ALTER TABLE caracteristicas 
ADD COLUMN IF NOT EXISTS categorias TEXT DEFAULT NULL COMMENT 'IDs das categorias separados por vírgula (ex: 1,2,3)';

-- 3. Configurar características existentes para camisetas
-- IMPORTANTE: Substitua 'SEU_VTEX_ID_AQUI' pelo vtex_id real da categoria de camisetas
-- Exemplo: se o vtex_id for 123456, use '123456'

UPDATE caracteristicas 
SET categorias = 'SEU_VTEX_ID_AQUI' 
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

-- 4. Inserir características específicas para camisetas
-- IMPORTANTE: Substitua 'SEU_VTEX_ID_AQUI' pelo vtex_id real da categoria de camisetas
INSERT IGNORE INTO caracteristicas (caracteristica, pergunta_ia, valores_possiveis, is_active, categorias) VALUES
('Tipo de Gola', 'Que tipo de gola ou decote esta peça possui? Gola redonda, V, polo, alta, baixa?', 'Redonda, V, Polo, Alta, Baixa, Sem gola, Assimétrica, Canoa, Quadrada', 1, 'SEU_VTEX_ID_AQUI'),
('Tipo de Manga', 'Que tipo de manga esta peça possui? Analise as imagens para identificar o comprimento e estilo da manga.', 'Sem manga, Manga curta, Manga longa, Manga 3/4, Manga raglan, Manga kimono', 1, 'SEU_VTEX_ID_AQUI'),
('Material Principal', 'Qual é o material principal desta peça de roupa? Analise as imagens e descrição para identificar o tecido.', 'Algodão, Poliéster, Viscose, Linho, Seda, Lã, Elastano, Modal, Bambu, Tecido misto', 1, 'SEU_VTEX_ID_AQUI'),
('Cor Principal', 'Qual é a cor predominante desta peça? Analise cuidadosamente as imagens e identifique a cor mais visível.', 'Branco, Preto, Azul, Vermelho, Verde, Amarelo, Rosa, Roxo, Laranja, Cinza, Marrom, Bege', 1, 'SEU_VTEX_ID_AQUI'),
('Estilo da Peça', 'Qual é o estilo geral desta peça de roupa? Analise o design, corte e características visuais.', 'Casual, Esportivo, Social, Básico, Estampado, Listrado, Xadrez, Liso, Oversized, Ajustado', 1, 'SEU_VTEX_ID_AQUI'),
('Ocasião de Uso', 'Para que ocasião esta peça é mais adequada? Analise o estilo e características da peça.', 'Dia a dia, Trabalho, Academia, Festa, Praia, Casa, Viagem, Evento social, Casual, Formal', 1, 'SEU_VTEX_ID_AQUI'),
('Instruções de Cuidado', 'Quais são as instruções de cuidado recomendadas para esta peça? Analise a etiqueta ou descrição do produto.', 'Lavar à mão, Lavar na máquina, Lavar a seco, Não alvejar, Passar em temperatura baixa, Não secar na máquina', 1, 'SEU_VTEX_ID_AQUI');

-- 5. Verificar resultado final
SELECT id, caracteristica, categorias 
FROM caracteristicas 
WHERE is_active = 1 
  AND (categorias IS NULL OR categorias = '' OR FIND_IN_SET('SEU_VTEX_ID_AQUI', categorias) > 0)
ORDER BY caracteristica;
