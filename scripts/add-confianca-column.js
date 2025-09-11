const mysql = require('mysql2/promise');
require('dotenv').config();

async function addConfiancaColumn() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar se a coluna já existe
    console.log('🔍 Verificando se a coluna confianca já existe...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'respostas_caracteristicas' AND COLUMN_NAME = 'confianca'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('⚠️ Coluna confianca já existe na tabela');
      return;
    }

    // Adicionar a coluna confianca
    console.log('➕ Adicionando coluna confianca...');
    await connection.execute(`
      ALTER TABLE respostas_caracteristicas 
      ADD COLUMN confianca DECIMAL(3,2) DEFAULT 0.0 COMMENT 'Nível de confiança da resposta (0.0 a 1.0)'
    `);

    console.log('✅ Coluna confianca adicionada com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

addConfiancaColumn();
