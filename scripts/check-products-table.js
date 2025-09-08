const mysql = require('mysql2/promise');
const { config } = require('dotenv');

config();

const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3349'),
  user: process.env.DB_USER || 'meli',
  password: process.env.DB_PASSWORD || '7dd3e59ddb3c3a5da0e3',
  database: process.env.DB_NAME || 'meli',
};

async function checkProductsTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados MySQL');

    // Verificar se a tabela products existe
    console.log('\n📊 Verificando se a tabela products existe...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products'
    `, [dbConfig.database]);

    if (tables.length === 0) {
      console.log('❌ Tabela products não existe!');
      return;
    }

    console.log('✅ Tabela products existe');

    // Verificar estrutura da tabela products
    console.log('\n📋 Verificando estrutura da tabela products...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products'
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);

    console.log('Colunas da tabela products:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${col.COLUMN_KEY ? `[${col.COLUMN_KEY}]` : ''}`);
    });

    // Verificar se ref_id existe
    const hasRefId = columns.some(col => col.COLUMN_NAME === 'ref_id');
    console.log(`\n🔍 Coluna ref_id existe: ${hasRefId ? '✅ SIM' : '❌ NÃO'}`);

  } catch (error) {
    console.error('❌ Erro ao verificar tabela products:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkProductsTable();
