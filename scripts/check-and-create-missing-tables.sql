-- Script para verificar e criar tabelas necessárias
-- Execute este script no seu banco de dados MySQL

USE seo_db;

-- Verificar quais tabelas existem
SELECT 'Tabelas existentes:' as info;
SHOW TABLES;

-- 1. Verificar e criar tabela descriptions
SELECT 'Verificando tabela descriptions...' as info;
SHOW TABLES LIKE 'descriptions';

-- Criar tabela descriptions se não existir
CREATE TABLE IF NOT EXISTS descriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_product_vtex INT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_id_product_vtex (id_product_vtex),
  INDEX idx_created_at (created_at),
  UNIQUE KEY unique_product_description (id_product_vtex)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Verificar e criar tabela anymarket_sync_logs
SELECT 'Verificando tabela anymarket_sync_logs...' as info;
SHOW TABLES LIKE 'anymarket_sync_logs';

-- Criar tabela anymarket_sync_logs se não existir
CREATE TABLE IF NOT EXISTS anymarket_sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  anymarket_id VARCHAR(255),
  title VARCHAR(500),
  description TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  response_data JSON,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_product_id (product_id),
  INDEX idx_anymarket_id (anymarket_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Verificar tabela respostas_caracteristicas
SELECT 'Verificando tabela respostas_caracteristicas...' as info;
SHOW TABLES LIKE 'respostas_caracteristicas';

-- 4. Verificar tabela titles
SELECT 'Verificando tabela titles...' as info;
SHOW TABLES LIKE 'titles';

-- 5. Verificar tabela analise_imagens
SELECT 'Verificando tabela analise_imagens...' as info;
SHOW TABLES LIKE 'analise_imagens';

-- Mostrar contagem de registros em cada tabela
SELECT 'Contagem de registros:' as info;

SELECT 'descriptions' as tabela, COUNT(*) as total FROM descriptions
UNION ALL
SELECT 'anymarket_sync_logs' as tabela, COUNT(*) as total FROM anymarket_sync_logs
UNION ALL
SELECT 'respostas_caracteristicas' as tabela, COUNT(*) as total FROM respostas_caracteristicas
UNION ALL
SELECT 'titles' as tabela, COUNT(*) as total FROM titles
UNION ALL
SELECT 'analise_imagens' as tabela, COUNT(*) as total FROM analise_imagens;

-- Mostrar alguns exemplos de dados
SELECT 'Exemplos de dados - descriptions:' as info;
SELECT * FROM descriptions LIMIT 3;

SELECT 'Exemplos de dados - respostas_caracteristicas:' as info;
SELECT * FROM respostas_caracteristicas LIMIT 3;
