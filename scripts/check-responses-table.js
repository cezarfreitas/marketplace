const mysql = require('mysql2/promise');

async function checkResponsesTable() {
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

    // Verificar se a tabela respostas_caracteristicas existe
    console.log('🔍 Verificando tabela respostas_caracteristicas...');
    
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'respostas_caracteristicas'
    `);

    if (tables && tables.length > 0) {
      console.log('✅ Tabela respostas_caracteristicas existe!');
      
      // Verificar estrutura da tabela
      const [columns] = await connection.execute(`
        DESCRIBE respostas_caracteristicas
      `);

      if (columns && columns.length > 0) {
        console.log(`\n📊 Colunas da tabela respostas_caracteristicas (${columns.length}):`);
        
        columns.forEach((column, index) => {
          console.log(`${index + 1}. ${column.Field} - ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${column.Key ? `[${column.Key}]` : ''}`);
        });
      }

      // Verificar dados existentes
      const [existingData] = await connection.execute(`
        SELECT COUNT(*) as count FROM respostas_caracteristicas
      `);

      console.log(`\n📊 Registros existentes: ${existingData[0].count}`);
    } else {
      console.log('❌ Tabela respostas_caracteristicas não existe!');
      console.log('💡 Será necessário criar a tabela');
    }

    // Verificar características ativas
    console.log('\n🔍 Verificando características ativas...');
    
    const [activeCharacteristics] = await connection.execute(`
      SELECT id, caracteristica, pergunta_ia, valores_possiveis, ativo
      FROM caracteristicas 
      WHERE ativo = 1
      ORDER BY caracteristica
    `);

    if (activeCharacteristics && activeCharacteristics.length > 0) {
      console.log(`\n📊 Características ativas (${activeCharacteristics.length}):`);
      
      activeCharacteristics.forEach((char, index) => {
        console.log(`${index + 1}. ${char.caracteristica}`);
        console.log(`   Pergunta: ${char.pergunta_ia}`);
        console.log(`   Valores: ${char.valores_possiveis || 'N/A'}`);
        console.log(`   Ativo: ${char.ativo ? 'Sim' : 'Não'}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhuma característica ativa encontrada!');
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

checkResponsesTable();
