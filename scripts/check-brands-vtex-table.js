const mysql = require('mysql2/promise');

async function checkBrandsVtexTable() {
  const connection = await mysql.createConnection({
    host: 'server.idenegociosdigitais.com.br',
    port: 3342,
    user: 'seo_data',
    password: '54779042baaa70be95c0',
    database: 'seo_data'
  });

  try {
    console.log('🔍 Verificando se a tabela brands_vtex existe...');
    
    const [rows] = await connection.execute('SHOW TABLES LIKE "brands_vtex"');
    console.log('Tabela brands_vtex existe:', rows.length > 0);
    
    if (rows.length === 0) {
      console.log('📦 Criando tabela brands_vtex...');
      
      await connection.execute(`
        CREATE TABLE brands_vtex (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vtex_id INT NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          title VARCHAR(255),
          meta_tag_description TEXT,
          image_url TEXT,
          brand_history TEXT,
          target_audience TEXT,
          language_type VARCHAR(100),
          consumption_behavior TEXT,
          visual_style TEXT,
          auxiliary_data_generated BOOLEAN DEFAULT FALSE,
          brand_analysis TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_vtex_id (vtex_id),
          INDEX idx_name (name),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Tabela brands_vtex criada com sucesso!');
    } else {
      console.log('✅ Tabela brands_vtex já existe!');
      
      // Verificar estrutura da tabela
      const [columns] = await connection.execute('DESCRIBE brands_vtex');
      console.log('📋 Estrutura da tabela:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
      
      // Verificar se há dados
      const [count] = await connection.execute('SELECT COUNT(*) as total FROM brands_vtex');
      console.log('📊 Total de marcas na tabela:', count[0].total);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

checkBrandsVtexTable();
