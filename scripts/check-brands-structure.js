const mysql = require('mysql2/promise');

async function checkBrandsTable() {
  let connection;
  
  try {
    // Configuração do banco de dados
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'meli',
      port: process.env.DB_PORT || 3306
    };

    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Conectado! Verificando estrutura da tabela brands...');
    const [rows] = await connection.execute('DESCRIBE brands');
    
    console.log('\n📋 Estrutura atual da tabela brands:');
    console.table(rows);
    
    // Verificar se a coluna meta_tag_description existe
    const hasMetaTagDescription = rows.some(row => row.Field === 'meta_tag_description');
    
    if (!hasMetaTagDescription) {
      console.log('\n❌ PROBLEMA: A coluna meta_tag_description não existe!');
      console.log('🔧 Vou adicionar a coluna...');
      
      await connection.execute(`
        ALTER TABLE brands 
        ADD COLUMN meta_tag_description TEXT AFTER title
      `);
      
      console.log('✅ Coluna meta_tag_description adicionada com sucesso!');
      
      // Verificar novamente
      const [newRows] = await connection.execute('DESCRIBE brands');
      console.log('\n📋 Nova estrutura da tabela brands:');
      console.table(newRows);
    } else {
      console.log('\n✅ A coluna meta_tag_description já existe!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkBrandsTable();