-- Tabela de relacionamento entre características e categorias
-- Permite definir quais características se aplicam a quais categorias

CREATE TABLE IF NOT EXISTS caracteristicas_categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    caracteristica_id INT NOT NULL,
    categoria_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_caracteristica_id (caracteristica_id),
    INDEX idx_categoria_id (categoria_id),
    INDEX idx_is_active (is_active),
    
    -- Chaves estrangeiras
    FOREIGN KEY (caracteristica_id) REFERENCES caracteristicas(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categories_vtex(id) ON DELETE CASCADE,
    
    -- Índice único para evitar duplicatas
    UNIQUE KEY unique_caracteristica_categoria (caracteristica_id, categoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Relacionamento entre características e categorias - define quais características se aplicam a quais categorias';
