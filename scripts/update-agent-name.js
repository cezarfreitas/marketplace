const mysql = require('mysql2/promise');

async function updateAgentName() {
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

    // Atualizar o nome do agente
    console.log('📝 Atualizando nome do agente...');
    
    const [result] = await connection.execute(`
      UPDATE agents 
      SET name = 'Descrição de Produto', updated_at = NOW()
      WHERE name = 'Descrição de Produto + FAQ'
    `);

    if (result.affectedRows > 0) {
      console.log('✅ Nome do agente atualizado com sucesso!');
      console.log('📋 Novo nome: "Descrição de Produto"');
    } else {
      console.log('⚠️ Nenhum agente foi encontrado com o nome anterior');
    }

    // Verificar o agente atualizado
    console.log('\n🔍 Verificando agente atualizado...');
    const [agent] = await connection.execute(`
      SELECT id, name, function_type, model, is_active 
      FROM agents 
      WHERE name = 'Descrição de Produto'
    `);

    if (agent.length > 0) {
      console.log('📊 Detalhes do agente:');
      console.log(`   - ID: ${agent[0].id}`);
      console.log(`   - Nome: ${agent[0].name}`);
      console.log(`   - Tipo: ${agent[0].function_type}`);
      console.log(`   - Modelo: ${agent[0].model}`);
      console.log(`   - Status: ${agent[0].is_active ? 'Ativo' : 'Inativo'}`);
    }

  } catch (error) {
    console.error('❌ Erro ao atualizar nome do agente:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateAgentName();
