-- Script para alterar a coluna 'contexto' na tabela 'brands_vtex'
-- para suportar textos maiores

USE meli;

-- Verificar se a coluna existe
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'brands_vtex' 
AND COLUMN_NAME = 'contexto';

-- Alterar a coluna para TEXT (até 65,535 caracteres)
ALTER TABLE brands_vtex 
MODIFY COLUMN contexto TEXT;

-- Verificar a alteração
DESCRIBE brands_vtex;
