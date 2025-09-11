const mysql = require('mysql2/promise');
require('dotenv').config();

async function addCategoriasColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 Verificando se a coluna categorias já existe...');
    
    // Verificar se a coluna já existe
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'caracteristicas' AND COLUMN_NAME = 'categorias'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('✅ Coluna categorias já existe na tabela caracteristicas');
    } else {
      console.log('🔧 Adicionando coluna categorias na tabela caracteristicas...');
      
      await connection.execute(`
        ALTER TABLE caracteristicas 
        ADD COLUMN categorias TEXT DEFAULT NULL COMMENT 'IDs das categorias separados por vírgula (ex: 1,2,3)'
      `);
      
      console.log('✅ Coluna categorias adicionada com sucesso!');
    }

    // Verificar estrutura da tabela
    console.log('\n🔍 Estrutura atual da tabela caracteristicas:');
    const [tableStructure] = await connection.execute('DESCRIBE caracteristicas');
    console.table(tableStructure);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
  }
}

addCategoriasColumn();
