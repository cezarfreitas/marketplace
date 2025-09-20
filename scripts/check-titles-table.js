const mysql = require('mysql2/promise');

async function checkTitlesTable() {
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

    // Verificar se a tabela titles existe
    console.log('🔍 Verificando se a tabela titles existe...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'titles'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela titles não encontrada!');
      console.log('💡 Execute o script: scripts/create-titles-table-simple.sql');
      return;
    }
    
    console.log('✅ Tabela titles encontrada!');

    // Verificar estrutura da tabela
    console.log('\n📊 Estrutura da tabela titles:');
    const [structure] = await connection.execute('DESCRIBE titles');
    console.table(structure);

    // Verificar registros existentes
    console.log('\n🔍 Verificando registros existentes...');
    const [records] = await connection.execute('SELECT COUNT(*) as count FROM titles');
    console.log(`📊 Total de registros: ${records[0].count}`);

    if (records[0].count > 0) {
      console.log('\n📋 Primeiros 5 registros:');
      const [sample] = await connection.execute('SELECT * FROM titles LIMIT 5');
      console.table(sample);
    }

    // Testar a query que está falhando
    console.log('\n🧪 Testando query da API...');
    try {
      const [testQuery] = await connection.execute(`
        SELECT 
          t.*,
          p.name as product_name,
          p.ref_id as product_ref_id,
          b.name as brand_name,
          c.name as category_name
        FROM titles t
        LEFT JOIN products_vtex p ON t.id_product_vtex = p.id_produto_vtex
        LEFT JOIN brands_vtex b ON p.brand_id = b.id_brand_vtex
        LEFT JOIN categories_vtex c ON p.category_id = c.id_categories_vtex
        WHERE t.status = 'validated'
        LIMIT 5
      `);
      
      console.log(`✅ Query executada com sucesso! Encontrados ${testQuery.length} registros`);
      if (testQuery.length > 0) {
        console.table(testQuery);
      }
    } catch (queryError) {
      console.log('❌ Erro na query:', queryError.message);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTitlesTable();
