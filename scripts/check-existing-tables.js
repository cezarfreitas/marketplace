const mysql = require('mysql2/promise');

async function checkExistingTables() {
  let connection;
  
  try {
    // Configuração do banco de dados
    const dbConfig = {
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: parseInt(process.env.DB_PORT) || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data',
      charset: 'utf8mb4'
    };

    console.log('🔗 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado!\n');

    // Listar todas as tabelas
    console.log('📋 Todas as tabelas no banco:');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_COMMENT, TABLE_ROWS
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);
    
    if (tables.length === 0) {
      console.log('❌ Nenhuma tabela encontrada no banco!');
    } else {
      console.log(`📊 Encontradas ${tables.length} tabelas:`);
      console.log('┌─────────────────────────────────┬─────────────────┬─────────────┐');
      console.log('│ Tabela                         │ Comentário      │ Registros   │');
      console.log('├─────────────────────────────────┼─────────────────┼─────────────┤');
      
      tables.forEach(table => {
        const name = table.TABLE_NAME.padEnd(31);
        const comment = (table.TABLE_COMMENT || 'N/A').substring(0, 15).padEnd(15);
        const rows = (table.TABLE_ROWS || 0).toString().padStart(11);
        
        console.log(`│ ${name} │ ${comment} │ ${rows} │`);
      });
      
      console.log('└─────────────────────────────────┴─────────────────┴─────────────┘');
    }

    // Verificar tabelas específicas que precisamos
    console.log('\n🔍 Verificando tabelas específicas necessárias:');
    const requiredTables = ['products', 'skus', 'brands', 'categories', 'stock'];
    
    for (const tableName of requiredTables) {
      const [exists] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      `, [dbConfig.database, tableName]);
      
      const status = exists[0].count > 0 ? '✅ Existe' : '❌ Não existe';
      console.log(`   ${tableName}: ${status}`);
    }

    // Se a tabela stock não existir, mostrar como criar
    const [stockExists] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock'
    `, [dbConfig.database]);
    
    if (stockExists[0].count === 0) {
      console.log('\n💡 Para criar a tabela stock:');
      console.log('   1. Execute: node scripts/create-stock-table.js');
      console.log('   2. Ou execute o SQL diretamente: scripts/create-stock-table.sql');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkExistingTables();
