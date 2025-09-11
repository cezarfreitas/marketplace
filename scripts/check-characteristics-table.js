const mysql = require('mysql2/promise');

async function checkCharacteristicsTable() {
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

    // Verificar estrutura da tabela caracteristicas
    console.log('🔍 Verificando estrutura da tabela caracteristicas...');
    
    const [columns] = await connection.execute(`
      DESCRIBE caracteristicas
    `);

    if (columns && columns.length > 0) {
      console.log(`\n📊 Colunas da tabela caracteristicas (${columns.length}):`);
      
      columns.forEach((column, index) => {
        console.log(`${index + 1}. ${column.Field} - ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${column.Key ? `[${column.Key}]` : ''}`);
      });
    }

    // Verificar dados existentes
    const [existingData] = await connection.execute(`
      SELECT id, caracteristica, pergunta_ia, valores_possiveis
      FROM caracteristicas 
      ORDER BY caracteristica
    `);

    if (existingData && existingData.length > 0) {
      console.log(`\n📊 Características existentes (${existingData.length}):`);
      
      existingData.forEach((char, index) => {
        console.log(`${index + 1}. ${char.caracteristica}`);
        console.log(`   Pergunta: ${char.pergunta_ia}`);
        console.log(`   Valores: ${char.valores_possiveis || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhuma característica encontrada!');
    }

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkCharacteristicsTable();
