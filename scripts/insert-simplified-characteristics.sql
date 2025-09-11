-- Inserir características básicas com estrutura simplificada
INSERT IGNORE INTO caracteristicas (nome, pergunta_ia, is_active, created_at, updated_at) VALUES
('Cor Principal', 'Qual é a cor predominante desta peça de roupa? Analise cuidadosamente as imagens e identifique a cor mais visível.', TRUE, NOW(), NOW()),
('Cores Secundárias', 'Existem outras cores além da principal? Se sim, quais são e onde aparecem na peça?', TRUE, NOW(), NOW()),
('Tipo de Caimento', 'Como é o caimento desta peça? É ajustada, solta, oversize, slim ou reta?', TRUE, NOW(), NOW()),
('Tipo de Manga', 'Que tipo de manga esta peça possui? Curta, longa, sem manga, 3/4, tomara que caia?', TRUE, NOW(), NOW()),
('Tipo de Gola', 'Que tipo de gola ou decote esta peça possui? Gola redonda, V, polo, alta, baixa?', TRUE, NOW(), NOW()),
('Tipo de Estampa', 'Esta peça possui estampas? Se sim, que tipo (lisa, listrada, floral, geométrica, logo)?', TRUE, NOW(), NOW()),
('Bolsos', 'Esta peça possui bolsos? Se sim, quantos, onde estão localizados e que tipo?', TRUE, NOW(), NOW()),
('Zíperes', 'Esta peça possui zíperes? Se sim, onde estão localizados e que tipo?', TRUE, NOW(), NOW()),
('Botões', 'Esta peça possui botões? Se sim, quantos, onde estão e que material?', TRUE, NOW(), NOW()),
('Bordados', 'Esta peça possui bordados ou aplicações? Se sim, onde estão e que tipo?', TRUE, NOW(), NOW()),
('Gênero', 'Para qual gênero esta peça é destinada? Masculino, feminino, unissex, infantil?', TRUE, NOW(), NOW()),
('Ocasião', 'Para que tipo de ocasião esta peça é adequada? Casual, esportivo, elegante, trabalho?', TRUE, NOW(), NOW()),
('Tipo de Tecido', 'Que tipo de tecido aparenta ser? Lisa, texturizada, com brilho, fosca?', TRUE, NOW(), NOW()),
('Transparência', 'O tecido é opaco, semi-transparente ou transparente?', TRUE, NOW(), NOW()),
('Acabamentos', 'Como são os acabamentos desta peça? Costuras bem feitas, detalhes de qualidade?', TRUE, NOW(), NOW());
