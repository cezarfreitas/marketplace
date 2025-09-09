const mysql = require('mysql2/promise');

async function deleteProductImagesTable() {
  let connection;
  
  try {
    // Configuração do banco de dados
    const dbConfig = {
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli',
      charset: 'utf8mb4'
    };

    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Verificar se a tabela existe antes de excluir
    console.log('\n📋 1. Verificando se a tabela product_images existe...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'meli' 
      AND TABLE_NAME = 'product_images'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela product_images não existe. Nada para excluir.');
      return;
    }
    
    console.log('✅ Tabela product_images encontrada');
    
    // 2. Verificar se há dados na tabela
    console.log('\n📊 2. Verificando dados na tabela...');
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM product_images');
    const totalRecords = countResult[0].total;
    console.log(`📊 Total de registros: ${totalRecords}`);
    
    if (totalRecords > 0) {
      console.log('⚠️ ATENÇÃO: A tabela contém dados!');
      console.log('❓ Deseja realmente excluir a tabela com dados?');
      console.log('💡 Recomendação: Faça backup dos dados antes de excluir');
      return;
    }
    
    // 3. Verificar foreign keys e constraints
    console.log('\n🔗 3. Verificando constraints e foreign keys...');
    const [constraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'meli' 
      AND (TABLE_NAME = 'product_images' OR REFERENCED_TABLE_NAME = 'product_images')
    `);
    
    if (constraints.length > 0) {
      console.log('📋 Constraints encontradas:');
      console.table(constraints);
    } else {
      console.log('✅ Nenhuma constraint encontrada');
    }
    
    // 4. Confirmar exclusão
    console.log('\n🗑️ 4. Preparando para excluir a tabela product_images...');
    console.log('⚠️ Esta operação é IRREVERSÍVEL!');
    console.log('📋 Resumo:');
    console.log(`   - Tabela: product_images`);
    console.log(`   - Registros: ${totalRecords}`);
    console.log(`   - Constraints: ${constraints.length}`);
    
    // 5. Executar exclusão
    console.log('\n🚀 5. Executando exclusão da tabela...');
    
    try {
      await connection.execute('DROP TABLE IF EXISTS product_images');
      console.log('✅ Tabela product_images excluída com sucesso!');
      
      // 6. Verificar se foi realmente excluída
      console.log('\n🔍 6. Verificando se a tabela foi excluída...');
      const [verifyTables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'meli' 
        AND TABLE_NAME = 'product_images'
      `);
      
      if (verifyTables.length === 0) {
        console.log('✅ Confirmação: Tabela product_images foi excluída com sucesso');
      } else {
        console.log('❌ Erro: Tabela ainda existe após tentativa de exclusão');
      }
      
    } catch (dropError) {
      console.error('❌ Erro ao excluir tabela:', dropError.message);
      throw dropError;
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar o script
deleteProductImagesTable();
