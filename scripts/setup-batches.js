require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupBatches() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: parseInt(process.env.DB_PORT || '3347'),
      user: process.env.DB_USER || 'seo_db',
      password: process.env.DB_PASSWORD || 'ba473d7d7da1e8fb6e6a',
      database: process.env.DB_NAME || 'seo_db',
      multipleStatements: true
    });
    
    console.log('✅ Conectado ao banco de dados');
    console.log('📝 Criando tabela batches...');
    
    // Criar tabela batches
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL COMMENT 'Nome do lote',
        description TEXT COMMENT 'Descrição do lote',
        status ENUM('active', 'archived') DEFAULT 'active' COMMENT 'Status do lote',
        total_products INT DEFAULT 0 COMMENT 'Total de produtos no lote',
        imported_at TIMESTAMP NULL COMMENT 'Data da importação',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
        
        INDEX idx_name (name),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de lotes de importação'
    `);
    
    console.log('✅ Tabela batches criada com sucesso');
    
    // Verificar se coluna batch_id já existe em products_vtex
    console.log('📝 Verificando coluna batch_id em products_vtex...');
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'products_vtex' 
        AND COLUMN_NAME = 'batch_id'
    `, [process.env.DB_NAME || 'seo_db']);
    
    if (columns.length === 0) {
      console.log('📝 Adicionando coluna batch_id em products_vtex...');
      
      await connection.execute(`
        ALTER TABLE products_vtex 
        ADD COLUMN batch_id INT DEFAULT NULL COMMENT 'ID do lote de importação'
      `);
      
      await connection.execute(`
        ALTER TABLE products_vtex 
        ADD INDEX idx_batch_id (batch_id)
      `);
      
      console.log('✅ Coluna batch_id adicionada em products_vtex');
    } else {
      console.log('ℹ️  Coluna batch_id já existe em products_vtex');
    }
    
    // Verificar se coluna batch_id já existe em anymarket
    console.log('📝 Verificando coluna batch_id em anymarket...');
    
    const [anymarketColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'anymarket' 
        AND COLUMN_NAME = 'batch_id'
    `, [process.env.DB_NAME || 'seo_db']);
    
    if (anymarketColumns.length === 0) {
      console.log('📝 Adicionando coluna batch_id em anymarket...');
      
      await connection.execute(`
        ALTER TABLE anymarket 
        ADD COLUMN batch_id INT DEFAULT NULL COMMENT 'ID do lote de importação'
      `);
      
      await connection.execute(`
        ALTER TABLE anymarket 
        ADD INDEX idx_batch_id (batch_id)
      `);
      
      console.log('✅ Coluna batch_id adicionada em anymarket');
    } else {
      console.log('ℹ️  Coluna batch_id já existe em anymarket');
    }
    
    console.log('\n🎉 Setup de lotes concluído com sucesso!');
    console.log('✅ Tabela batches criada');
    console.log('✅ Coluna batch_id adicionada em products_vtex');
    console.log('✅ Coluna batch_id adicionada em anymarket');
    console.log('\n👉 Agora você pode usar a funcionalidade de lotes!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar lotes:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexão fechada');
    }
  }
}

setupBatches();

