-- Script para adicionar o campo enviado_any na tabela anymarket
-- Execute este script no seu banco de dados MySQL

USE seo_db;

-- Adicionar coluna enviado_any se não existir
ALTER TABLE anymarket 
ADD COLUMN IF NOT EXISTS enviado_any TIMESTAMP NULL COMMENT 'Data em que os dados foram enviados para o Anymarket';

-- Verificar a estrutura da tabela
DESCRIBE anymarket;

-- Mostrar informações sobre a tabela
SHOW CREATE TABLE anymarket;
