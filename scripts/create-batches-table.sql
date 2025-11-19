-- Criar tabela de Lotes (Batches)
-- Esta tabela armazena informações sobre lotes de importação de produtos

CREATE TABLE IF NOT EXISTS batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT 'Nome do lote',
  description TEXT COMMENT 'Descrição do lote',
  status ENUM('active', 'archived') DEFAULT 'active' COMMENT 'Status do lote',
  total_products INT DEFAULT 0 COMMENT 'Total de produtos no lote',
  imported_at TIMESTAMP NULL COMMENT 'Data da importação',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de lotes de importação';

-- Adicionar campo batch_id na tabela products_vtex (se não existir)
ALTER TABLE products_vtex 
ADD COLUMN IF NOT EXISTS batch_id INT DEFAULT NULL COMMENT 'ID do lote de importação',
ADD INDEX IF NOT EXISTS idx_batch_id (batch_id);

-- Adicionar campo batch_id na tabela anymarket (se não existir)
ALTER TABLE anymarket 
ADD COLUMN IF NOT EXISTS batch_id INT DEFAULT NULL COMMENT 'ID do lote de importação',
ADD INDEX IF NOT EXISTS idx_batch_id (batch_id);

-- Comentários
-- batch_id: Relaciona o produto com o lote de importação
-- Permite filtrar produtos por lote
-- Facilita gerenciamento e organização de importações

