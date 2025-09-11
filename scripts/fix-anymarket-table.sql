-- Script para corrigir a tabela anymarket
-- Execute este script no seu banco de dados MySQL

-- Verificar se a tabela anymarket existe
-- Se não existir, criar a tabela
CREATE TABLE IF NOT EXISTS anymarket (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_produto_vtex INT NOT NULL,
  id_produto_any VARCHAR(255) NOT NULL,
  data_sincronizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_id_produto_vtex (id_produto_vtex),
  INDEX idx_id_produto_any (id_produto_any),
  UNIQUE KEY unique_produto_vtex (id_produto_vtex),
  UNIQUE KEY unique_produto_any (id_produto_any)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Se a tabela já existe, verificar e adicionar colunas que faltam
-- Adicionar coluna id se não existir
ALTER TABLE anymarket 
ADD COLUMN IF NOT EXISTS id INT AUTO_INCREMENT PRIMARY KEY FIRST;

-- Adicionar coluna id_produto_vtex se não existir
ALTER TABLE anymarket 
ADD COLUMN IF NOT EXISTS id_produto_vtex INT NOT NULL;

-- Adicionar coluna id_produto_any se não existir
ALTER TABLE anymarket 
ADD COLUMN IF NOT EXISTS id_produto_any VARCHAR(255) NOT NULL;

-- Adicionar coluna data_sincronizacao se não existir
ALTER TABLE anymarket 
ADD COLUMN IF NOT EXISTS data_sincronizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Adicionar índices se não existirem
ALTER TABLE anymarket 
ADD INDEX IF NOT EXISTS idx_id_produto_vtex (id_produto_vtex);

ALTER TABLE anymarket 
ADD INDEX IF NOT EXISTS idx_id_produto_any (id_produto_any);

-- Adicionar chaves únicas se não existirem
ALTER TABLE anymarket 
ADD UNIQUE KEY IF NOT EXISTS unique_produto_vtex (id_produto_vtex);

ALTER TABLE anymarket 
ADD UNIQUE KEY IF NOT EXISTS unique_produto_any (id_produto_any);

-- Verificar a estrutura final da tabela
DESCRIBE anymarket;
