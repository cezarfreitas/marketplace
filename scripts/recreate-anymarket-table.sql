-- Recriar tabela anymarket com estrutura correta
DROP TABLE IF EXISTS anymarket;

CREATE TABLE anymarket (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_produto_vtex INT NOT NULL DEFAULT 0,
  id_produto_any VARCHAR(255) NOT NULL,
  data_sincronizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_id_produto_vtex (id_produto_vtex),
  INDEX idx_id_produto_any (id_produto_any),
  UNIQUE KEY unique_produto_any (id_produto_any)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar estrutura
DESCRIBE anymarket;
