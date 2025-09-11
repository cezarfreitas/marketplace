const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixStockVtexTable() {
  let connection;
  
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'seo_data',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔗 Conectado ao banco de dados');

    // Remover a foreign key constraint
    console.log('🔧 Removendo foreign key constraint...');
    await connection.execute('ALTER TABLE stock_vtex DROP FOREIGN KEY stock_vtex_ibfk_1');
    console.log('✅ Foreign key constraint removida');

    // Verificar se a tabela foi modificada
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_vtex'
    `, [process.env.DB_NAME || 'seo_data']);

    if (tables.length > 0) {
      console.log('✅ Tabela stock_vtex ainda existe');
    } else {
      console.log('❌ Erro: Tabela stock_vtex não foi encontrada');
    }

  } catch (error) {
    console.error('❌ Erro ao modificar tabela:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar o script
fixStockVtexTable();
