-- Script para configurar características para a categoria ID 15301
-- Este script irá configurar características típicas para camisetas/t-shirts

-- 1. Primeiro, vamos verificar qual é a categoria ID 15301
SELECT 
    id_category_vtex as id,
    name,
    is_active,
    created_at
FROM categories_vtex 
WHERE id_category_vtex = 15301;

-- 2. Verificar se a coluna categorias existe na tabela caracteristicas
-- Se não existir, vamos adicioná-la
ALTER TABLE caracteristicas 
ADD COLUMN IF NOT EXISTS categorias TEXT DEFAULT NULL COMMENT 'IDs das categorias separados por vírgula (ex: 15301,15302)';

-- 3. Verificar características existentes
SELECT 
    id,
    caracteristica,
    categorias,
    is_active
FROM caracteristicas 
WHERE is_active = 1 
ORDER BY caracteristica;

-- 4. Configurar características típicas para camisetas (categoria 15301)
-- Atualizar características existentes que se aplicam a camisetas
UPDATE caracteristicas 
SET categorias = CASE 
    WHEN categorias IS NULL OR categorias = '' THEN '15301'
    WHEN FIND_IN_SET('15301', categorias) = 0 THEN CONCAT(categorias, ',15301')
    ELSE categorias
END
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

-- 5. Inserir características específicas para camisetas se não existirem
INSERT IGNORE INTO caracteristicas (caracteristica, pergunta_ia, valores_possiveis, is_active, categorias) VALUES
('Tipo de Gola', 'Que tipo de gola ou decote esta peça possui? Gola redonda, V, polo, alta, baixa?', 'Redonda, V, Polo, Alta, Baixa, Sem gola, Assimétrica, Canoa, Quadrada', 1, '15301'),
('Tipo de Manga', 'Que tipo de manga esta peça possui? Analise as imagens para identificar o comprimento e estilo da manga.', 'Sem manga, Manga curta, Manga longa, Manga 3/4, Manga raglan, Manga kimono', 1, '15301'),
('Material Principal', 'Qual é o material principal desta peça de roupa? Analise as imagens e descrição para identificar o tecido.', 'Algodão, Poliéster, Viscose, Linho, Seda, Lã, Elastano, Modal, Bambu, Tecido misto', 1, '15301'),
('Cor Principal', 'Qual é a cor predominante desta peça? Analise cuidadosamente as imagens e identifique a cor mais visível.', 'Branco, Preto, Azul, Vermelho, Verde, Amarelo, Rosa, Roxo, Laranja, Cinza, Marrom, Bege', 1, '15301'),
('Tipo de Estampa', 'Que tipo de estampa ou design esta peça possui? Analise as imagens para identificar padrões, logos ou estampas.', 'Lisa, Listrada, Xadrez, Floral, Geométrica, Animal Print, Logo/Brand, Frase/Texto, Abstrata, Tie-dye', 1, '15301'),
('Estilo', 'Qual é o estilo desta peça? Analise o design geral para determinar o estilo.', 'Casual, Esportivo, Formal, Vintage, Moderno, Clássico, Streetwear, Boho, Minimalista, Oversized', 1, '15301'),
('Gênero', 'Para qual gênero esta peça é destinada? Analise o design e corte da peça.', 'Masculino, Feminino, Unissex, Infantil', 1, '15301'),
('Ocasião', 'Para que ocasiões esta peça é adequada? Analise o estilo e design.', 'Casual, Trabalho, Academia, Festa, Viagem, Casa, Praia, Inverno, Verão', 1, '15301'),
('Cuidados', 'Quais são os cuidados necessários para esta peça? Analise o material e instruções.', 'Lavar à mão, Lavar na máquina, Não usar alvejante, Passar a ferro, Lavagem a seco, Não torcer', 1, '15301'),
('Comprimento', 'Qual é o comprimento desta peça? Analise as imagens para determinar o comprimento.', 'Curto, Médio, Longo, Oversized, Ajustado, Solto', 1, '15301');

-- 6. Verificar o resultado final
SELECT 
    id,
    caracteristica,
    categorias,
    is_active
FROM caracteristicas 
WHERE is_active = 1 
  AND (categorias IS NULL OR categorias = '' OR FIND_IN_SET('15301', categorias) > 0)
ORDER BY caracteristica;

-- 7. Verificar quantas características estão configuradas para a categoria 15301
SELECT 
    COUNT(*) as total_caracteristicas,
    COUNT(CASE WHEN FIND_IN_SET('15301', categorias) > 0 THEN 1 END) as caracteristicas_categoria_15301
FROM caracteristicas 
WHERE is_active = 1;
