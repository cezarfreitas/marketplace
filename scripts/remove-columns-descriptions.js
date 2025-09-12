const mysql = require('mysql2/promise');

async function removeColumnsFromDescriptions() {
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

    // Verificar estrutura atual da tabela
    console.log('📊 Estrutura atual da tabela descriptions:');
    const [structure] = await connection.execute('DESCRIBE descriptions');
    structure.forEach(field => {
      console.log(`   - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${field.Key ? `[${field.Key}]` : ''}`);
    });

    // Verificar se as colunas existem
    const titleColumn = structure.find(field => field.Field === 'title');
    const faqColumn = structure.find(field => field.Field === 'faq');

    if (!titleColumn && !faqColumn) {
      console.log('✅ As colunas title e faq já foram removidas!');
      return;
    }

    // Remover coluna title se existir
    if (titleColumn) {
      console.log('\n🗑️ Removendo coluna title...');
      try {
        await connection.execute('ALTER TABLE descriptions DROP COLUMN title');
        console.log('✅ Coluna title removida com sucesso!');
      } catch (error) {
        console.log('❌ Erro ao remover coluna title:', error.message);
      }
    }

    // Remover coluna faq se existir
    if (faqColumn) {
      console.log('\n🗑️ Removendo coluna faq...');
      try {
        await connection.execute('ALTER TABLE descriptions DROP COLUMN faq');
        console.log('✅ Coluna faq removida com sucesso!');
      } catch (error) {
        console.log('❌ Erro ao remover coluna faq:', error.message);
      }
    }

    // Verificar estrutura final
    console.log('\n📊 Estrutura final da tabela descriptions:');
    const [finalStructure] = await connection.execute('DESCRIBE descriptions');
    finalStructure.forEach(field => {
      console.log(`   - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${field.Key ? `[${field.Key}]` : ''}`);
    });

    console.log('\n✅ Remoção de colunas concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

removeColumnsFromDescriptions();
