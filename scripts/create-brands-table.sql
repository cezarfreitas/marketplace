-- Criar tabela de marcas
CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vtex_id INT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  title VARCHAR(255),
  meta_tag_description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_brands_vtex_id ON brands(vtex_id);
CREATE INDEX idx_brands_name ON brands(name);
CREATE INDEX idx_brands_is_active ON brands(is_active);