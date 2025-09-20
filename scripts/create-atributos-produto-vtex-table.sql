-- Criação da tabela atributos_produto_vtex
-- Esta tabela armazena os atributos/especificações dos produtos VTEX

CREATE TABLE IF NOT EXISTS atributos_produto_vtex (
    id_atributo_vtex INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_produto_vtex INT NOT NULL,
    field_id INT,
    field_name VARCHAR(255),
    field_value_id INT,
    field_value VARCHAR(500),
    is_specification BOOLEAN DEFAULT FALSE,
    is_filter BOOLEAN DEFAULT FALSE,
    is_required BOOLEAN DEFAULT FALSE,
    is_stock_keeping_unit BOOLEAN DEFAULT FALSE,
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para melhor performance
    INDEX idx_produto_vtex (id_produto_vtex),
    INDEX idx_field_id (field_id),
    INDEX idx_field_name (field_name),
    INDEX idx_field_value_id (field_value_id),
    
    -- Chave estrangeira para produtos_vtex
    FOREIGN KEY (id_produto_vtex) REFERENCES products_vtex(id_produto_vtex) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentários da tabela
ALTER TABLE atributos_produto_vtex COMMENT = 'Tabela para armazenar atributos/especificações dos produtos VTEX';

-- Comentários das colunas
ALTER TABLE atributos_produto_vtex 
    MODIFY COLUMN id_atributo_vtex INT NOT NULL AUTO_INCREMENT COMMENT 'ID único do atributo',
    MODIFY COLUMN id_produto_vtex INT NOT NULL COMMENT 'ID do produto VTEX (FK para products_vtex)',
    MODIFY COLUMN field_id INT COMMENT 'ID do campo na VTEX',
    MODIFY COLUMN field_name VARCHAR(255) COMMENT 'Nome do campo/atributo',
    MODIFY COLUMN field_value_id INT COMMENT 'ID do valor do campo na VTEX',
    MODIFY COLUMN field_value VARCHAR(500) COMMENT 'Valor do campo/atributo',
    MODIFY COLUMN is_specification BOOLEAN DEFAULT FALSE COMMENT 'Se é uma especificação técnica',
    MODIFY COLUMN is_filter BOOLEAN DEFAULT FALSE COMMENT 'Se pode ser usado como filtro',
    MODIFY COLUMN is_required BOOLEAN DEFAULT FALSE COMMENT 'Se é obrigatório',
    MODIFY COLUMN is_stock_keeping_unit BOOLEAN DEFAULT FALSE COMMENT 'Se é usado para SKU',
    MODIFY COLUMN position INT DEFAULT 0 COMMENT 'Posição/ordem do atributo',
    MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
    MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização';
