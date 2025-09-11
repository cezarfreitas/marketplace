-- Tabela de características
CREATE TABLE IF NOT EXISTS caracteristicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL COMMENT 'Tipo da característica (ex: Cor, Material, Estilo)',
    nome VARCHAR(255) NOT NULL COMMENT 'Nome da característica (ex: Cor Principal, Tipo de Manga)',
    pergunta_ia TEXT NOT NULL COMMENT 'Pergunta específica para a IA analisar',
    descricao TEXT COMMENT 'Descrição adicional da característica',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Se a característica está ativa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_tipo (tipo),
    INDEX idx_nome (nome),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at),
    
    -- Índice único para evitar duplicatas
    UNIQUE KEY unique_tipo_nome (tipo, nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela de características para análise de produtos';

-- Tabela de respostas das características
CREATE TABLE IF NOT EXISTS respostas_caracteristicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    caracteristica_id INT NOT NULL COMMENT 'ID da característica',
    produto_id INT NOT NULL COMMENT 'ID do produto analisado',
    analise_imagem_id INT COMMENT 'ID da análise de imagem relacionada',
    resposta TEXT NOT NULL COMMENT 'Resposta da IA para a característica',
    confianca DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Nível de confiança da resposta (0.00 a 1.00)',
    tokens_usados INT DEFAULT 0 COMMENT 'Tokens utilizados para gerar esta resposta',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_caracteristica_id (caracteristica_id),
    INDEX idx_produto_id (produto_id),
    INDEX idx_analise_imagem_id (analise_imagem_id),
    INDEX idx_created_at (created_at),
    
    -- Chaves estrangeiras
    FOREIGN KEY (caracteristica_id) REFERENCES caracteristicas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES products_vtex(id) ON DELETE CASCADE,
    
    -- Índice único para evitar duplicatas
    UNIQUE KEY unique_caracteristica_produto (caracteristica_id, produto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela de respostas das características por produto';

-- Inserir características básicas de exemplo
INSERT IGNORE INTO caracteristicas (tipo, nome, pergunta_ia, descricao) VALUES
('Cor', 'Cor Principal', 'Qual é a cor predominante desta peça de roupa? Analise cuidadosamente as imagens e identifique a cor mais visível.', 'Cor principal do produto'),
('Cor', 'Cores Secundárias', 'Existem outras cores além da principal? Se sim, quais são e onde aparecem?', 'Cores secundárias ou de detalhes'),
('Modelagem', 'Tipo de Caimento', 'Como é o caimento desta peça? É ajustada, solta, oversize, slim ou reta?', 'Tipo de modelagem e caimento'),
('Modelagem', 'Tipo de Manga', 'Que tipo de manga esta peça possui? Curta, longa, sem manga, 3/4, tomara que caia?', 'Tipo de manga da peça'),
('Detalhes', 'Tipo de Gola', 'Que tipo de gola ou decote esta peça possui? Gola redonda, V, polo, alta, baixa?', 'Tipo de gola ou decote'),
('Detalhes', 'Estampas', 'Esta peça possui estampas? Se sim, que tipo (lisa, listrada, floral, geométrica, logo)?', 'Tipo de estampa presente'),
('Detalhes', 'Bolsos', 'Esta peça possui bolsos? Se sim, quantos, onde estão localizados e que tipo?', 'Presença e tipo de bolsos'),
('Detalhes', 'Zíperes', 'Esta peça possui zíperes? Se sim, onde estão localizados e que tipo?', 'Presença e localização de zíperes'),
('Detalhes', 'Botões', 'Esta peça possui botões? Se sim, quantos, onde estão e que material?', 'Presença e tipo de botões'),
('Detalhes', 'Bordados', 'Esta peça possui bordados ou aplicações? Se sim, onde estão e que tipo?', 'Presença de bordados ou aplicações'),
('Estilo', 'Gênero', 'Para qual gênero esta peça é destinada? Masculino, feminino, unissex, infantil?', 'Público-alvo por gênero'),
('Estilo', 'Ocasião', 'Para que tipo de ocasião esta peça é adequada? Casual, esportivo, elegante, trabalho?', 'Adequação para ocasiões'),
('Material', 'Tipo de Tecido', 'Que tipo de tecido aparenta ser? Lisa, texturizada, com brilho, fosca?', 'Aparência do tecido'),
('Material', 'Transparência', 'O tecido é opaco, semi-transparente ou transparente?', 'Nível de transparência do tecido'),
('Qualidade', 'Acabamentos', 'Como são os acabamentos desta peça? Costuras bem feitas, detalhes de qualidade?', 'Qualidade dos acabamentos visíveis');
