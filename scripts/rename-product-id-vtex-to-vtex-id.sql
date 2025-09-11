-- Script para renomear o campo product_id_vtex para vtex_id na tabela products_vtex
-- Isso vai padronizar o nome do campo com as outras tabelas

-- 1. Primeiro, vamos verificar a estrutura atual
SELECT 'Estrutura atual da tabela products_vtex:' as info;
DESCRIBE products_vtex;

-- 2. Remover a chave primária atual
ALTER TABLE products_vtex DROP PRIMARY KEY;

-- 3. Renomear a coluna product_id_vtex para vtex_id
ALTER TABLE products_vtex CHANGE COLUMN product_id_vtex vtex_id INT NOT NULL;

-- 4. Adicionar a chave primária novamente
ALTER TABLE products_vtex ADD PRIMARY KEY (vtex_id);

-- 5. Verificar a nova estrutura
SELECT 'Nova estrutura da tabela products_vtex:' as info;
DESCRIBE products_vtex;

-- 6. Verificar se os dados foram preservados
SELECT 'Verificação dos dados:' as info;
SELECT COUNT(*) as total_produtos FROM products_vtex;
SELECT vtex_id, name, ref_id FROM products_vtex LIMIT 3;
