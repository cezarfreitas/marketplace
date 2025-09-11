-- Inserir características específicas para camisetas se não existirem
INSERT IGNORE INTO caracteristicas (caracteristica, pergunta_ia, valores_possiveis, is_active, categorias) VALUES
('Tipo de Gola', 'Que tipo de gola ou decote esta peça possui? Gola redonda, V, polo, alta, baixa?', 'Redonda, V, Polo, Alta, Baixa, Sem gola, Assimétrica, Canoa, Quadrada', 1, '16'),
('Tipo de Manga', 'Que tipo de manga esta peça possui? Analise as imagens para identificar o comprimento e estilo da manga.', 'Sem manga, Manga curta, Manga longa, Manga 3/4, Manga raglan, Manga kimono', 1, '16'),
('Material Principal', 'Qual é o material principal desta peça de roupa? Analise as imagens e descrição para identificar o tecido.', 'Algodão, Poliéster, Viscose, Linho, Seda, Lã, Elastano, Modal, Bambu, Tecido misto', 1, '16'),
('Cor Principal', 'Qual é a cor predominante desta peça? Analise cuidadosamente as imagens e identifique a cor mais visível.', 'Branco, Preto, Azul, Vermelho, Verde, Amarelo, Rosa, Roxo, Laranja, Cinza, Marrom, Bege', 1, '16'),
('Estilo da Peça', 'Qual é o estilo geral desta peça de roupa? Analise o design, corte e características visuais.', 'Casual, Esportivo, Social, Básico, Estampado, Listrado, Xadrez, Liso, Oversized, Ajustado', 1, '16'),
('Ocasião de Uso', 'Para que ocasião esta peça é mais adequada? Analise o estilo e características da peça.', 'Dia a dia, Trabalho, Academia, Festa, Praia, Casa, Viagem, Evento social, Casual, Formal', 1, '16'),
('Instruções de Cuidado', 'Quais são as instruções de cuidado recomendadas para esta peça? Analise a etiqueta ou descrição do produto.', 'Lavar à mão, Lavar na máquina, Lavar a seco, Não alvejar, Passar em temperatura baixa, Não secar na máquina', 1, '16');

-- Verificar resultado
SELECT id, caracteristica, categorias 
FROM caracteristicas 
WHERE is_active = 1 
  AND (categorias IS NULL OR categorias = '' OR FIND_IN_SET('16', categorias) > 0)
ORDER BY caracteristica;
