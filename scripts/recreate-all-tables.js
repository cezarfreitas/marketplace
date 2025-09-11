const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3342'),
  user: process.env.DB_USER || 'seo_data',
  password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
  database: process.env.DB_NAME || 'seo_data',
  charset: 'utf8mb4'
};

async function recreateAllTables() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados seo_data');

    // Lista de tabelas para recriar (em ordem de dependência)
    const tables = [
      'usuarios',
      'system_config', 
      'brands_vtex',
      'categories_vtex',
      'products_vtex',
      'skus_vtex',
      'images_vtex',
      'stock_vtex',
      'sku_sellers',
      'crop_logs',
      'agents',
      'analysis_logs',
      'anymarket_sync_logs'
    ];

    console.log('🗑️ Removendo tabelas existentes...');
    for (const table of tables.reverse()) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`   ✅ Tabela ${table} removida`);
      } catch (error) {
        console.log(`   ⚠️ Erro ao remover ${table}: ${error.message}`);
      }
    }

    console.log('\n🏗️ Criando todas as tabelas...');

    // 1. Tabela usuarios
    console.log('👤 Criando tabela usuarios...');
    await connection.execute(`
      CREATE TABLE usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        login_attempts INT DEFAULT 0,
        locked_until TIMESTAMP NULL,
        avatar_url TEXT,
        telefone VARCHAR(20),
        departamento VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_is_active (is_active),
        INDEX idx_last_login (last_login),
        INDEX idx_created_at (created_at)
        
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela usuarios criada');

    // 2. Tabela system_config
    console.log('⚙️ Criando tabela system_config...');
    await connection.execute(`
      CREATE TABLE system_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT,
        description TEXT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_config_key (config_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela system_config criada');

    // 3. Tabela brands_vtex
    console.log('🏷️ Criando tabela brands_vtex...');
    await connection.execute(`
      CREATE TABLE brands_vtex (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vtex_id INT UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        title VARCHAR(255),
        meta_tag_description TEXT,
        image_url TEXT,
        contexto VARCHAR(100) DEFAULT 'imported_from_vtex',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vtex_id (vtex_id),
        INDEX idx_name (name),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela brands_vtex criada');

    // 4. Tabela categories_vtex
    console.log('📂 Criando tabela categories_vtex...');
    await connection.execute(`
      CREATE TABLE categories_vtex (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vtex_id INT UNIQUE NOT NULL,
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
        score INT,
        link_id VARCHAR(255),
        has_children BOOLEAN DEFAULT FALSE,
        contexto VARCHAR(100) DEFAULT 'imported_from_vtex',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vtex_id (vtex_id),
        INDEX idx_name (name),
        INDEX idx_father_category_id (father_category_id),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela categories_vtex criada');

    // 5. Tabela products_vtex
    console.log('📦 Criando tabela products_vtex...');
    await connection.execute(`
      CREATE TABLE products_vtex (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vtex_id INT UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        department_id INT,
        category_id INT,
        brand_id INT,
        link_id VARCHAR(255),
        ref_id VARCHAR(255),
        is_visible BOOLEAN DEFAULT TRUE,
        description TEXT,
        description_short TEXT,
        release_date DATETIME,
        keywords TEXT,
        title VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        tax_code VARCHAR(50),
        meta_tag_description TEXT,
        supplier_id INT,
        show_without_stock BOOLEAN DEFAULT TRUE,
        adwords_remarketing_code VARCHAR(255),
        lomadee_campaign_code VARCHAR(255),
        score INT,
        commercial_condition_id INT,
        reward_value DECIMAL(10,2) DEFAULT 0,
        estimated_date_arrival DATETIME,
        measurement_unit VARCHAR(10) DEFAULT 'un',
        unit_multiplier INT DEFAULT 1,
        information_source VARCHAR(50) DEFAULT 'vtex',
        modal_type VARCHAR(50) DEFAULT 'default',
        contexto VARCHAR(100) DEFAULT 'imported_from_vtex',
        anymarket_id VARCHAR(255),
        anymarket_sync_status ENUM('pending', 'synced', 'error') DEFAULT 'pending',
        anymarket_sync_date TIMESTAMP NULL,
        marketplace_description TEXT,
        marketplace_generated_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vtex_id (vtex_id),
        INDEX idx_name (name),
        INDEX idx_ref_id (ref_id),
        INDEX idx_brand_id (brand_id),
        INDEX idx_category_id (category_id),
        INDEX idx_is_active (is_active),
        INDEX idx_is_visible (is_visible),
        INDEX idx_anymarket_id (anymarket_id),
        INDEX idx_anymarket_sync_status (anymarket_sync_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela products_vtex criada');

    // 6. Tabela skus_vtex
    console.log('📋 Criando tabela skus_vtex...');
    await connection.execute(`
      CREATE TABLE skus_vtex (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vtex_id INT UNIQUE NOT NULL,
        product_id INT NOT NULL,
        name_complete VARCHAR(255),
        complement_name VARCHAR(255),
        product_name VARCHAR(255),
        product_description TEXT,
        product_ref_id VARCHAR(255),
        tax_code VARCHAR(50),
        sku_name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        is_transported BOOLEAN DEFAULT FALSE,
        is_inventoried BOOLEAN DEFAULT FALSE,
        is_gift_card_recharge BOOLEAN DEFAULT FALSE,
        image_url VARCHAR(500),
        detail_url VARCHAR(500),
        csc_identification VARCHAR(255),
        brand_id VARCHAR(255),
        brand_name VARCHAR(255),
        manufacturer_code VARCHAR(255),
        is_kit BOOLEAN DEFAULT FALSE,
        commercial_condition_id INT,
        reward_value DECIMAL(10,2) DEFAULT 0,
        estimated_date_arrival DATETIME,
        measurement_unit VARCHAR(10) DEFAULT 'un',
        unit_multiplier INT DEFAULT 1,
        information_source VARCHAR(50) DEFAULT 'vtex',
        modal_type VARCHAR(50) DEFAULT 'default',
        contexto VARCHAR(100) DEFAULT 'imported_from_vtex',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vtex_id (vtex_id),
        INDEX idx_product_id (product_id),
        INDEX idx_sku_name (sku_name),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela skus_vtex criada');

    // 7. Tabela images_vtex
    console.log('🖼️ Criando tabela images_vtex...');
    await connection.execute(`
      CREATE TABLE images_vtex (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vtex_id INT UNIQUE NOT NULL,
        archive_id INT,
        sku_id INT NOT NULL,
        name VARCHAR(255),
        is_main BOOLEAN DEFAULT FALSE,
        text VARCHAR(255),
        label VARCHAR(255),
        url VARCHAR(500),
        file_location VARCHAR(500),
        position INT DEFAULT 0,
        contexto VARCHAR(100) DEFAULT 'imported_from_vtex',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vtex_id (vtex_id),
        INDEX idx_sku_id (sku_id),
        INDEX idx_is_main (is_main),
        INDEX idx_position (position)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela images_vtex criada');

    // 8. Tabela stock_vtex
    console.log('📦 Criando tabela stock_vtex...');
    await connection.execute(`
      CREATE TABLE stock_vtex (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku_id INT NOT NULL,
        warehouse_id VARCHAR(50) NOT NULL,
        warehouse_name VARCHAR(255),
        quantity INT DEFAULT 0,
        reserved_quantity INT DEFAULT 0,
        available_quantity INT DEFAULT 0,
        unlimited_stock BOOLEAN DEFAULT FALSE,
        date_utc_on_balance_system TIMESTAMP NULL,
        time_to_refill INT DEFAULT 0,
        total_quantity INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        contexto VARCHAR(100) DEFAULT 'imported_from_vtex',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sku_id (sku_id),
        INDEX idx_warehouse_id (warehouse_id),
        INDEX idx_is_active (is_active),
        UNIQUE KEY unique_sku_warehouse (sku_id, warehouse_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela stock_vtex criada');

    // 9. Tabela sku_sellers
    console.log('🏪 Criando tabela sku_sellers...');
    await connection.execute(`
      CREATE TABLE sku_sellers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku_id INT NOT NULL,
        seller_id VARCHAR(50) NOT NULL,
        seller_name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sku_id (sku_id),
        INDEX idx_seller_id (seller_id),
        INDEX idx_is_active (is_active),
        UNIQUE KEY unique_sku_seller (sku_id, seller_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela sku_sellers criada');

    // 10. Tabela crop_logs
    console.log('✂️ Criando tabela crop_logs...');
    await connection.execute(`
      CREATE TABLE crop_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        product_name VARCHAR(255),
        anymarket_id VARCHAR(255),
        status ENUM('pending', 'processing', 'completed', 'error') DEFAULT 'pending',
        original_images_count INT DEFAULT 0,
        cropped_images_count INT DEFAULT 0,
        error_message TEXT,
        processing_time_ms INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        INDEX idx_anymarket_id (anymarket_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela crop_logs criada');

    // 11. Tabela agents
    console.log('🤖 Criando tabela agents...');
    await connection.execute(`
      CREATE TABLE agents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('analysis', 'generation', 'processing') NOT NULL,
        config JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_type (type),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela agents criada');

    // 12. Tabela analysis_logs
    console.log('📊 Criando tabela analysis_logs...');
    await connection.execute(`
      CREATE TABLE analysis_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        agent_id INT,
        analysis_type VARCHAR(100) NOT NULL,
        input_data JSON,
        output_data JSON,
        status ENUM('pending', 'processing', 'completed', 'error') DEFAULT 'pending',
        processing_time_ms INT DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        INDEX idx_agent_id (agent_id),
        INDEX idx_analysis_type (analysis_type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela analysis_logs criada');

    // 13. Tabela anymarket_sync_logs
    console.log('🔄 Criando tabela anymarket_sync_logs...');
    await connection.execute(`
      CREATE TABLE anymarket_sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        anymarket_id VARCHAR(255),
        sync_type ENUM('product', 'stock', 'price', 'image') NOT NULL,
        status ENUM('pending', 'syncing', 'completed', 'error') DEFAULT 'pending',
        request_data JSON,
        response_data JSON,
        error_message TEXT,
        sync_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        INDEX idx_anymarket_id (anymarket_id),
        INDEX idx_sync_type (sync_type),
        INDEX idx_status (status),
        INDEX idx_sync_date (sync_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabela anymarket_sync_logs criada');

    // Inserir configurações padrão
    console.log('\n⚙️ Inserindo configurações padrão...');
    await connection.execute(`
      INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
      ('vtex_account_name', '', 'Nome da conta VTEX'),
      ('vtex_environment', 'vtexcommercestable', 'Ambiente da API VTEX'),
      ('vtex_app_key', '', 'App Key da API VTEX'),
      ('vtex_app_token', '', 'App Token da API VTEX'),
      ('openai_api_key', '', 'Chave da API OpenAI'),
      ('anymarket_api_key', '', 'Chave da API Anymarket'),
      ('anymarket_api_secret', '', 'Secret da API Anymarket'),
      ('anymarket_token', '', 'Token da API Anymarket')
    `);
    console.log('✅ Configurações padrão inseridas');

    // Criar usuário admin
    console.log('\n👤 Criando usuário admin...');
    const password = 'admin';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await connection.execute(`
      INSERT IGNORE INTO usuarios (nome, email, senha, role, is_active, created_at, updated_at)
      VALUES ('Administrador', 'admin@admin.com', ?, 'admin', 1, NOW(), NOW())
    `, [passwordHash]);
    console.log('✅ Usuário admin criado');

    // Verificar tabelas criadas
    console.log('\n📊 Verificando tabelas criadas...');
    const [tablesCreated] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);

    console.log('\n✅ Tabelas criadas com sucesso:');
    tablesCreated.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    console.log('\n🎉 Todas as tabelas foram recriadas com sucesso!');
    console.log('\n📋 Informações do usuário admin:');
    console.log('📧 Email: admin@admin.com');
    console.log('🔑 Senha: admin');
    console.log('👑 Role: admin');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco encerrada');
    }
  }
}

// Executar o script
recreateAllTables();
