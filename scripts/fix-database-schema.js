const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabaseSchema() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar estrutura atual da tabela
    console.log('🔍 Verificando estrutura da tabela respostas_caracteristicas...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'respostas_caracteristicas'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);

    console.log('📋 Colunas atuais:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Verificar se a coluna confianca existe
    const confiancaExists = columns.some(col => col.COLUMN_NAME === 'confianca');
    
    if (!confiancaExists) {
      console.log('➕ Adicionando coluna confianca...');
      await connection.execute(`
        ALTER TABLE respostas_caracteristicas 
        ADD COLUMN confianca DECIMAL(3,2) DEFAULT 0.0 COMMENT 'Nível de confiança da resposta (0.0 a 1.0)'
      `);
      console.log('✅ Coluna confianca adicionada com sucesso!');
    } else {
      console.log('✅ Coluna confianca já existe');
    }

    // Verificar estrutura final
    console.log('🔍 Verificando estrutura final...');
    const [finalColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'respostas_caracteristicas'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);

    console.log('📋 Estrutura final:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.code) {
      console.error('Código do erro:', error.code);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

fixDatabaseSchema();
