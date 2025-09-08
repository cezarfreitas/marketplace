const mysql = require('mysql2/promise');

async function checkDatabase() {
  let connection;
  
  try {
    console.log('🔄 Testando conexão com MySQL...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'meli'
    });

    console.log('✅ Conexão com MySQL estabelecida com sucesso!');
    
    // Verificar se as tabelas existem
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📊 Tabelas existentes:');
    
    if (tables.length === 0) {
      console.log('  - Nenhuma tabela encontrada');
    } else {
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  - ${tableName}`);
      });
    }
    
    // Verificar especificamente as tabelas que precisamos
    const [brandsTable] = await connection.execute("SHOW TABLES LIKE 'brands'");
    const [configTable] = await connection.execute("SHOW TABLES LIKE 'system_config'");
    
    console.log('');
    console.log('🔍 Status das tabelas necessárias:');
    console.log(`  - brands: ${brandsTable.length > 0 ? '✅ Existe' : '❌ Não existe'}`);
    console.log(`  - system_config: ${configTable.length > 0 ? '✅ Existe' : '❌ Não existe'}`);

  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Dica: Verifique se o MySQL está rodando');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Dica: Verifique usuário e senha do MySQL');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Dica: O banco de dados "meli" não existe');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkDatabase();
