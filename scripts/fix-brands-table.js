const mysql = require('mysql2/promise');

async function fixBrandsTable() {
  let connection;
  
  try {
    // Configuração do banco de dados (usando valores padrão)
    const dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'meli',
      port: 3306
    };

    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Conectado! Verificando estrutura da tabela brands...');
    
    // Verificar se a tabela existe
    const [tables] = await connection.execute("SHOW TABLES LIKE 'brands'");
    
    if (tables.length === 0) {
      console.log('❌ Tabela brands não existe! Criando...');
      
      await connection.execute(`
        CREATE TABLE brands (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Tabela brands criada com sucesso!');
    } else {
      console.log('✅ Tabela brands existe! Verificando colunas...');
      
      // Verificar estrutura atual
      const [rows] = await connection.execute('DESCRIBE brands');
      console.log('\n📋 Estrutura atual:');
      console.table(rows);
      
      // Verificar se a coluna meta_tag_description existe
      const hasMetaTagDescription = rows.some(row => row.Field === 'meta_tag_description');
      
      if (!hasMetaTagDescription) {
        console.log('\n❌ Coluna meta_tag_description não existe! Adicionando...');
        
        await connection.execute(`
          ALTER TABLE brands 
          ADD COLUMN meta_tag_description TEXT AFTER title
        `);
        
        console.log('✅ Coluna meta_tag_description adicionada!');
      } else {
        console.log('\n✅ Coluna meta_tag_description já existe!');
      }
    }
    
    // Verificar estrutura final
    const [finalRows] = await connection.execute('DESCRIBE brands');
    console.log('\n📋 Estrutura final da tabela brands:');
    console.table(finalRows);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixBrandsTable();
