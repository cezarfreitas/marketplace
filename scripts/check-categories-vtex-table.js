const mysql = require('mysql2/promise');

async function checkCategoriesVtexTable() {
  const connection = await mysql.createConnection({
    host: 'server.idenegociosdigitais.com.br',
    port: 3342,
    user: 'seo_data',
    password: '54779042baaa70be95c0',
    database: 'seo_data'
  });

  try {
    console.log('🔍 Verificando se a tabela categories_vtex existe...');
    
    const [rows] = await connection.execute('SHOW TABLES LIKE "categories_vtex"');
    console.log('Tabela categories_vtex existe:', rows.length > 0);
    
    if (rows.length === 0) {
      console.log('📦 Criando tabela categories_vtex...');
      
      await connection.execute(`
        CREATE TABLE categories_vtex (
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
          tree_path TEXT,
          tree_path_ids TEXT,
          tree_path_link_ids TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_vtex_id (vtex_id),
          INDEX idx_name (name),
          INDEX idx_father_category_id (father_category_id),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Tabela categories_vtex criada com sucesso!');
    } else {
      console.log('✅ Tabela categories_vtex já existe!');
      
      // Verificar estrutura da tabela
      const [columns] = await connection.execute('DESCRIBE categories_vtex');
      console.log('📋 Estrutura da tabela:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

checkCategoriesVtexTable();
