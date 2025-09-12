const mysql = require('mysql2/promise');

async function updateAgentGuidelines() {
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

    // Atualizar o guidelines_template do agente
    console.log('🔧 Atualizando guidelines_template do agente...');
    
    const updateQuery = `
      UPDATE agents 
      SET guidelines_template = ?, updated_at = NOW()
      WHERE id = 6 AND name = 'Descrição de Produto'
    `;
    
    const guidelinesTemplate = `Crie uma descrição completa e FAQ para este produto:

TÍTULO: {title}

Gere uma descrição persuasiva e um FAQ útil baseado apenas no título fornecido.`;
    
    const [result] = await connection.execute(updateQuery, [guidelinesTemplate]);
    
    if (result.affectedRows > 0) {
      console.log('✅ Guidelines template atualizado com sucesso!');
    } else {
      console.log('⚠️ Nenhum agente foi atualizado');
    }

    // Verificar o agente atualizado
    console.log('\n🔍 Verificando agente atualizado...');
    const [agent] = await connection.execute(`
      SELECT id, name, function_type, model, max_tokens, temperature, 
             system_prompt IS NOT NULL as has_system_prompt,
             guidelines_template IS NOT NULL as has_guidelines
      FROM agents 
      WHERE id = 6
    `);

    if (agent.length > 0) {
      const a = agent[0];
      console.log('📊 Detalhes do agente:');
      console.log(`   - ID: ${a.id}`);
      console.log(`   - Nome: ${a.name}`);
      console.log(`   - Tipo: ${a.function_type}`);
      console.log(`   - Modelo: ${a.model}`);
      console.log(`   - Max Tokens: ${a.max_tokens}`);
      console.log(`   - Temperature: ${a.temperature}`);
      console.log(`   - System Prompt: ${a.has_system_prompt ? 'Configurado' : 'NÃO CONFIGURADO'}`);
      console.log(`   - Guidelines Template: ${a.has_guidelines ? 'Configurado' : 'NÃO CONFIGURADO'}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateAgentGuidelines();
