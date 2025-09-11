const mysql = require('mysql2/promise');

async function checkMarketplaceColumns() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3342,
      user: 'seo_data',
      password: '54779042baaa70be95c0',
      database: 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar estrutura da tabela marketplace
    console.log('🔍 Verificando estrutura da tabela marketplace...');
    
    const [columns] = await connection.execute(`
      DESCRIBE marketplace
    `);

    if (columns && columns.length > 0) {
      console.log(`\n📊 Colunas da tabela marketplace (${columns.length}):`);
      
      columns.forEach((column, index) => {
        console.log(`${index + 1}. ${column.Field} - ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${column.Key ? `[${column.Key}]` : ''}`);
      });
    }

    console.log('\n✅ Estrutura da tabela verificada!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkMarketplaceColumns();
