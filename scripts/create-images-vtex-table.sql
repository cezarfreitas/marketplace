-- Tabela para armazenar imagens da VTEX
-- Baseada na estrutura da API VTEX: /api/catalog/pvt/stockkeepingunit/{skuId}/file

CREATE TABLE IF NOT EXISTS images_vtex (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vtex_id INT NOT NULL,                    -- Id da VTEX
    archive_id INT NOT NULL,                 -- ArchiveId da VTEX
    sku_id INT NOT NULL,                     -- SkuId da VTEX
    name VARCHAR(500) NOT NULL,              -- Nome da imagem
    is_main BOOLEAN DEFAULT FALSE,           -- Se é a imagem principal
    text VARCHAR(500),                       -- Texto da imagem
    label VARCHAR(255),                      -- Label da imagem
    url TEXT,                                -- URL da imagem (pode ser null)
    file_location TEXT NOT NULL,             -- Localização do arquivo
    position INT DEFAULT 0,                  -- Posição da imagem
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para performance
    INDEX idx_vtex_id (vtex_id),
    INDEX idx_archive_id (archive_id),
    INDEX idx_sku_id (sku_id),
    INDEX idx_is_main (is_main),
    INDEX idx_position (position),
    INDEX idx_created_at (created_at),
    
    -- Índice único para evitar duplicatas
    UNIQUE KEY unique_vtex_image (vtex_id),
    
    -- Chave estrangeira para SKUs (se a tabela skus existir)
    -- FOREIGN KEY (sku_id) REFERENCES skus(vtex_id) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentários para documentação
ALTER TABLE images_vtex COMMENT = 'Tabela para armazenar imagens dos SKUs da VTEX';

-- Adicionar comentários nas colunas
ALTER TABLE images_vtex 
    MODIFY COLUMN vtex_id INT NOT NULL COMMENT 'ID único da imagem na VTEX',
    MODIFY COLUMN archive_id INT NOT NULL COMMENT 'ID do arquivo na VTEX',
    MODIFY COLUMN sku_id INT NOT NULL COMMENT 'ID do SKU na VTEX',
    MODIFY COLUMN name VARCHAR(500) NOT NULL COMMENT 'Nome da imagem',
    MODIFY COLUMN is_main BOOLEAN DEFAULT FALSE COMMENT 'Indica se é a imagem principal do SKU',
    MODIFY COLUMN text VARCHAR(500) COMMENT 'Texto descritivo da imagem',
    MODIFY COLUMN label VARCHAR(255) COMMENT 'Label da imagem',
    MODIFY COLUMN url TEXT COMMENT 'URL completa da imagem (pode ser null)',
    MODIFY COLUMN file_location TEXT NOT NULL COMMENT 'Localização do arquivo na VTEX',
    MODIFY COLUMN position INT DEFAULT 0 COMMENT 'Posição da imagem na sequência';
