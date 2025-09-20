const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupTitleGenerationTable() {
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

    // Ler o script SQL
    const sqlPath = path.join(__dirname, 'create-title-generation-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executando script SQL...');
    await connection.execute(sqlContent);
    
    console.log('✅ Tabela title_generation_logs criada com sucesso!');

    // Verificar se a tabela foi criada corretamente
    console.log('🔍 Verificando estrutura da tabela...');
    const [structure] = await connection.execute('DESCRIBE title_generation_logs');
    
    console.log('\n📊 Estrutura da tabela title_generation_logs:');
    structure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${field.Key ? `[${field.Key}]` : ''}`);
    });

    console.log('\n🎯 Próximos passos:');
    console.log('1. Atualizar o código de geração de título para usar agente hardcoded');
    console.log('2. Remover dependências da tabela agents para geração de título');
    console.log('3. Testar a nova implementação');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupTitleGenerationTable();
