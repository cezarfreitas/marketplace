-- Remover colunas desnecessárias da tabela marketplace
ALTER TABLE marketplace DROP COLUMN seller_sku;
ALTER TABLE marketplace DROP COLUMN wedge_shape;
ALTER TABLE marketplace DROP COLUMN is_sportive;
ALTER TABLE marketplace DROP COLUMN main_color;
ALTER TABLE marketplace DROP COLUMN item_condition;
ALTER TABLE marketplace DROP COLUMN brand;

-- Remover também outras colunas relacionadas a dados estruturados
ALTER TABLE marketplace DROP COLUMN tipo_roupa;
ALTER TABLE marketplace DROP COLUMN produto_vestuario;
ALTER TABLE marketplace DROP COLUMN tipo_manga;
ALTER TABLE marketplace DROP COLUMN genero;
ALTER TABLE marketplace DROP COLUMN cor;
ALTER TABLE marketplace DROP COLUMN variacoes_nome;
