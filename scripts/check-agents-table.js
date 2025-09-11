const mysql = require('mysql2/promise');

async function checkAgentsTable() {
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

    // Verificar estrutura da tabela agents
    console.log('🔍 Verificando estrutura da tabela agents...');
    
    const [columns] = await connection.execute(`
      DESCRIBE agents
    `);

    if (columns && columns.length > 0) {
      console.log(`\n📊 Colunas da tabela agents (${columns.length}):`);
      
      columns.forEach((column, index) => {
        console.log(`${index + 1}. ${column.Field} - ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${column.Key ? `[${column.Key}]` : ''}`);
      });
    }

    // Verificar agentes existentes
    console.log('\n🔍 Verificando agentes existentes...');
    
    const [existingAgents] = await connection.execute(`
      SELECT id, name, model, max_tokens, temperature, is_active
      FROM agents 
      ORDER BY id
    `);

    if (existingAgents && existingAgents.length > 0) {
      console.log(`\n📊 Agentes existentes (${existingAgents.length}):`);
      
      existingAgents.forEach((agent, index) => {
        console.log(`${index + 1}. ID: ${agent.id} - ${agent.name}`);
        console.log(`   Modelo: ${agent.model}`);
        console.log(`   Max Tokens: ${agent.max_tokens}`);
        console.log(`   Temperature: ${agent.temperature}`);
        console.log(`   Ativo: ${agent.is_active ? 'Sim' : 'Não'}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhum agente encontrado!');
    }

    console.log('\n✅ Verificação da tabela agents concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkAgentsTable();