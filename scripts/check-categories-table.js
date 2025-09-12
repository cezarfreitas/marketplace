const mysql = require('mysql2/promise');

async function checkCategoriesTable() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar se a tabela categories_vtex existe
    console.log('🔍 Verificando tabela categories_vtex...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME LIKE '%categor%'
    `);
    
    console.log('📊 Tabelas de categorias encontradas:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    if (tables.length === 0) {
      console.log('❌ Nenhuma tabela de categorias encontrada!');
      return;
    }

    // Verificar estrutura da tabela categories_vtex
    console.log('\n📊 Estrutura da tabela categories_vtex:');
    try {
      const [structure] = await connection.execute('DESCRIBE categories_vtex');
      structure.forEach(field => {
        console.log(`   - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${field.Key ? `[${field.Key}]` : ''}`);
      });
    } catch (error) {
      console.log('❌ Erro ao verificar estrutura:', error.message);
    }

    // Verificar alguns registros
    console.log('\n📈 Verificando registros na tabela categories_vtex:');
    try {
      const [categories] = await connection.execute('SELECT * FROM categories_vtex LIMIT 3');
      console.log(`   Total de registros: ${categories.length}`);
      categories.forEach((cat, index) => {
        console.log(`   ${index + 1}. ID: ${cat.id}, Nome: ${cat.name}`);
      });
    } catch (error) {
      console.log('❌ Erro ao verificar registros:', error.message);
    }

    // Verificar estrutura da tabela products_vtex para ver como faz o JOIN
    console.log('\n📊 Verificando campo category_id na tabela products_vtex:');
    try {
      const [productStructure] = await connection.execute('DESCRIBE products_vtex');
      const categoryField = productStructure.find(field => field.Field.includes('categor'));
      if (categoryField) {
        console.log(`   - ${categoryField.Field}: ${categoryField.Type}`);
      } else {
        console.log('   ❌ Campo de categoria não encontrado em products_vtex');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar products_vtex:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkCategoriesTable();
