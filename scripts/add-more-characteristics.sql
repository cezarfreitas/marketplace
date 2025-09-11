-- Adicionar mais características de exemplo para teste
INSERT IGNORE INTO caracteristicas (caracteristica, pergunta_ia, valores_possiveis, is_active, created_at, updated_at) VALUES
('Cor Principal', 'Qual é a cor predominante desta peça de roupa? Analise cuidadosamente as imagens e identifique a cor mais visível.', 'Vermelho, Azul, Verde, Preto, Branco, Rosa, Amarelo, Roxo, Laranja, Marrom', TRUE, NOW(), NOW()),
('Tipo de Caimento', 'Como é o caimento desta peça? É ajustada, solta, oversize, slim ou reta?', 'Ajustada, Solta, Oversize, Slim, Reta, Tomara que caia, Assimétrica', TRUE, NOW(), NOW()),
('Tipo de Manga', 'Que tipo de manga esta peça possui? Curta, longa, sem manga, 3/4, tomara que caia?', 'Curta, Longa, Sem manga, 3/4, Tomara que caia, Bufante, Sino, Raglan', TRUE, NOW(), NOW()),
('Tipo de Gola', 'Que tipo de gola ou decote esta peça possui? Gola redonda, V, polo, alta, baixa?', 'Redonda, V, Polo, Alta, Baixa, Sem gola, Assimétrica, Canoa, Quadrada', TRUE, NOW(), NOW()),
('Tipo de Estampa', 'Esta peça possui estampas? Se sim, que tipo (lisa, listrada, floral, geométrica, logo)?', 'Lisa, Listrada, Floral, Geométrica, Animal print, Xadrez, Abstrata, Logo, Texto', TRUE, NOW(), NOW()),
('Gênero', 'Para qual gênero esta peça é destinada? Masculino, feminino, unissex, infantil?', 'Masculino, Feminino, Unissex, Meninos, Meninas, Bebês', TRUE, NOW(), NOW()),
('Ocasião', 'Para que tipo de ocasião esta peça é adequada? Casual, esportivo, elegante, trabalho?', 'Casual, Formal, Esportivo, Festa, Trabalho, Dia a dia, Praia, Noturna', TRUE, NOW(), NOW());
