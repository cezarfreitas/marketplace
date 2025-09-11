const mysql = require('mysql2/promise');
require('dotenv').config();

async function removeConfiancaColumn() {
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

    // Verificar se a coluna confianca existe
    console.log('🔍 Verificando se a coluna confianca existe...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'respostas_caracteristicas' AND COLUMN_NAME = 'confianca'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      console.log('⚠️ Coluna confianca não existe na tabela');
      return;
    }

    // Remover a coluna confianca
    console.log('➖ Removendo coluna confianca...');
    await connection.execute(`
      ALTER TABLE respostas_caracteristicas 
      DROP COLUMN confianca
    `);

    console.log('✅ Coluna confianca removida com sucesso!');

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

removeConfiancaColumn();
