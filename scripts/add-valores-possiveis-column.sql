-- Adicionar coluna valores_possiveis na tabela caracteristicas
ALTER TABLE caracteristicas ADD COLUMN valores_possiveis TEXT NULL COMMENT 'Valores possíveis para esta característica (ex: Vermelho, Azul, Verde)';

-- Atualizar algumas características existentes com valores possíveis de exemplo
UPDATE caracteristicas SET valores_possiveis = 'Vermelho, Azul, Verde, Preto, Branco, Rosa, Amarelo, Roxo, Laranja, Marrom' WHERE nome = 'Cor Principal';
UPDATE caracteristicas SET valores_possiveis = 'Ajustada, Solta, Oversize, Slim, Reta, Tomara que caia, Assimétrica' WHERE nome = 'Tipo de Caimento';
UPDATE caracteristicas SET valores_possiveis = 'Curta, Longa, Sem manga, 3/4, Tomara que caia, Bufante, Sino, Raglan' WHERE nome = 'Tipo de Manga';
UPDATE caracteristicas SET valores_possiveis = 'Redonda, V, Polo, Alta, Baixa, Sem gola, Assimétrica, Canoa, Quadrada' WHERE nome = 'Tipo de Gola';
UPDATE caracteristicas SET valores_possiveis = 'Lisa, Listrada, Floral, Geométrica, Animal print, Xadrez, Abstrata, Logo, Texto' WHERE nome = 'Tipo de Estampa';
UPDATE caracteristicas SET valores_possiveis = 'Masculino, Feminino, Unissex, Meninos, Meninas, Bebês' WHERE nome = 'Gênero';
UPDATE caracteristicas SET valores_possiveis = 'Casual, Formal, Esportivo, Festa, Trabalho, Dia a dia, Praia, Noturna' WHERE nome = 'Ocasião';
UPDATE caracteristicas SET valores_possiveis = 'Opaco, Semi-transparente, Transparente' WHERE nome = 'Transparência';
