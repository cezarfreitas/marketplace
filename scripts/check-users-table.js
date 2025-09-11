const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3342'),
  user: process.env.DB_USER || 'seo_data',
  password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
  database: process.env.DB_NAME || 'seo_data',
};

async function checkUsersTable() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');

    // Verificar estrutura da tabela usuarios
    const [columns] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios'
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);

    console.log('📋 Estrutura da tabela usuarios:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY ? `(${col.COLUMN_KEY})` : ''}`);
    });

    // Verificar se há usuários
    const [users] = await connection.execute('SELECT * FROM usuarios LIMIT 5');
    console.log(`\n👥 Usuários encontrados: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Nome: ${user.nome || 'N/A'}, Email: ${user.email || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkUsersTable();
