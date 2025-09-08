-- Script para criar as tabelas do sistema de importação VTEX
-- Banco: meli

-- Tabela de marcas (estrutura limpa baseada no JSON da API VTEX)
CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vtex_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    title VARCHAR(255),
    meta_tag_description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vtex_id (vtex_id),
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vtex_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    father_category_id INT,
    title VARCHAR(255),
    description TEXT,
    keywords TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    lomadee_campaign_code VARCHAR(255),
    adwords_remarketing_code VARCHAR(255),
    show_in_store_front BOOLEAN DEFAULT TRUE,
    show_brand_filter BOOLEAN DEFAULT TRUE,
    active_store_front_link BOOLEAN DEFAULT TRUE,
    global_category_id INT,
    stock_keeping_unit_selection_mode VARCHAR(50),
    score INT DEFAULT 0,
    link_id VARCHAR(255),
    has_children BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vtex_id (vtex_id),
    INDEX idx_name (name),
    INDEX idx_father_category_id (father_category_id),
    INDEX idx_is_active (is_active),
    FOREIGN KEY (father_category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vtex_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    department_id INT,
    category_id INT,
    brand_id INT,
    link_id VARCHAR(255),
    ref_id VARCHAR(255),
    is_visible BOOLEAN DEFAULT TRUE,
    description TEXT,
    description_short TEXT,
    release_date DATE,
    keywords TEXT,
    title VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    tax_code VARCHAR(50),
    meta_tag_description TEXT,
    supplier_id INT,
    show_without_stock BOOLEAN DEFAULT FALSE,
    adwords_remarketing_code VARCHAR(255),
    lomadee_campaign_code VARCHAR(255),
    score INT DEFAULT 0,
    commercial_condition_id INT,
    reward_value DECIMAL(10,2) DEFAULT 0,
    estimated_date_arrival DATE,
    measurement_unit VARCHAR(50),
    unit_multiplier INT DEFAULT 1,
    information_source VARCHAR(255),
    modal_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vtex_id (vtex_id),
    INDEX idx_name (name),
    INDEX idx_category_id (category_id),
    INDEX idx_brand_id (brand_id),
    INDEX idx_is_active (is_active),
    INDEX idx_is_visible (is_visible),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de SKUs
CREATE TABLE IF NOT EXISTS skus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vtex_id INT NOT NULL UNIQUE,
    product_id INT NOT NULL,
    name_complete VARCHAR(255),
    complement_name VARCHAR(255),
    product_name VARCHAR(255),
    product_description TEXT,
    product_ref_id VARCHAR(255),
    tax_code VARCHAR(50),
    sku_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_transported BOOLEAN DEFAULT TRUE,
    is_inventoried BOOLEAN DEFAULT TRUE,
    is_gift_card_recharge BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    detail_url TEXT,
    csc_identification VARCHAR(255),
    brand_id VARCHAR(255),
    brand_name VARCHAR(255),
    manufacturer_code VARCHAR(255),
    is_kit BOOLEAN DEFAULT FALSE,
    commercial_condition_id INT,
    reward_value DECIMAL(10,2) DEFAULT 0,
    estimated_date_arrival DATE,
    measurement_unit VARCHAR(50),
    unit_multiplier INT DEFAULT 1,
    information_source VARCHAR(255),
    modal_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vtex_id (vtex_id),
    INDEX idx_product_id (product_id),
    INDEX idx_name_complete (name_complete),
    INDEX idx_is_active (is_active),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de especificações de produtos
CREATE TABLE IF NOT EXISTS product_specifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    field_id INT NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_value_ids TEXT,
    is_filter BOOLEAN DEFAULT FALSE,
    field_group_id INT,
    field_group_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_id (product_id),
    INDEX idx_field_id (field_id),
    INDEX idx_field_name (field_name),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de imagens de produtos
CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url TEXT NOT NULL,
    image_name VARCHAR(255),
    file_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_id (product_id),
    INDEX idx_file_id (file_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de vídeos de produtos
CREATE TABLE IF NOT EXISTS product_videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    video_url TEXT NOT NULL,
    video_title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_id (product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de logs de importação
CREATE TABLE IF NOT EXISTS import_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    import_type ENUM('products', 'categories', 'brands', 'skus') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    total_items INT DEFAULT 0,
    processed_items INT DEFAULT 0,
    failed_items INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_import_type (import_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de itens de importação
CREATE TABLE IF NOT EXISTS import_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    import_log_id INT NOT NULL,
    vtex_id INT NOT NULL,
    item_type ENUM('product', 'category', 'brand', 'sku') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    raw_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_import_log_id (import_log_id),
    INDEX idx_vtex_id (vtex_id),
    INDEX idx_item_type (item_type),
    INDEX idx_status (status),
    FOREIGN KEY (import_log_id) REFERENCES import_logs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de usuários (para autenticação)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configurações padrão
INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
('vtex_account_name', '', 'Nome da conta VTEX'),
('vtex_environment', 'vtexcommercestable', 'Ambiente da API VTEX (vtexcommercestable ou vtexcommercestable)'),
('vtex_app_key', '', 'App Key da API VTEX'),
('vtex_app_token', '', 'App Token da API VTEX'),
('vtex_base_url', '', 'URL base da API VTEX');

-- Inserir usuário padrão (senha: admin123)
INSERT IGNORE INTO users (username, email, password_hash) VALUES 
('admin', 'admin@vtex-importer.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Views úteis para relatórios
CREATE OR REPLACE VIEW v_import_summary AS
SELECT 
    il.import_type,
    il.status,
    COUNT(*) as total_imports,
    SUM(il.total_items) as total_items,
    SUM(il.processed_items) as processed_items,
    SUM(il.failed_items) as failed_items,
    AVG(TIMESTAMPDIFF(SECOND, il.started_at, il.completed_at)) as avg_duration_seconds
FROM import_logs il
GROUP BY il.import_type, il.status;

CREATE OR REPLACE VIEW v_product_stats AS
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_products,
    COUNT(CASE WHEN is_visible = 1 THEN 1 END) as visible_products,
    COUNT(DISTINCT category_id) as unique_categories,
    COUNT(DISTINCT brand_id) as unique_brands
FROM products;

CREATE OR REPLACE VIEW v_category_hierarchy AS
SELECT 
    c.id,
    c.name,
    c.vtex_id,
    c.father_category_id,
    fc.name as father_category_name,
    c.is_active,
    c.has_children,
    c.created_at
FROM categories c
LEFT JOIN categories fc ON c.father_category_id = fc.id
ORDER BY c.father_category_id, c.name;
