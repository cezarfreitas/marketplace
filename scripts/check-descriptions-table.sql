-- Script para verificar se a tabela descriptions existe e sua estrutura
-- Execute este script no seu banco de dados MySQL

USE seo_db;

-- Verificar se a tabela descriptions existe
SHOW TABLES LIKE 'descriptions';

-- Se existir, mostrar sua estrutura
DESCRIBE descriptions;

-- Verificar se há dados na tabela
SELECT COUNT(*) as total_descriptions FROM descriptions;

-- Mostrar alguns exemplos de dados
SELECT * FROM descriptions LIMIT 5;

-- Verificar se há produtos com descrições
SELECT 
    p.id_produto_vtex,
    p.name,
    d.description,
    d.created_at
FROM products_vtex p
LEFT JOIN descriptions d ON p.id_produto_vtex = d.id_product_vtex
WHERE d.id_product_vtex IS NOT NULL
LIMIT 10;
