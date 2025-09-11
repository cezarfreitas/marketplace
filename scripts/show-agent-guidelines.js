const mysql = require('mysql2/promise');

async function showAgentGuidelines() {
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

    const [agents] = await connection.execute(`
      SELECT id, name, system_prompt, guidelines_template, model, max_tokens, temperature 
      FROM agents 
      WHERE function_type = 'image_analysis' AND is_active = TRUE 
      LIMIT 1
    `);
    
    if (agents.length > 0) {
      const agent = agents[0];
      console.log('\n🤖 AGENTE DE ANÁLISE DE IMAGENS');
      console.log('================================');
      console.log('ID:', agent.id);
      console.log('Nome:', agent.name);
      console.log('Modelo:', agent.model);
      console.log('Max Tokens:', agent.max_tokens);
      console.log('Temperatura:', agent.temperature);
      console.log('');
      console.log('📋 SYSTEM PROMPT:');
      console.log('-----------------');
      console.log(agent.system_prompt);
      console.log('');
      console.log('📝 GUIDELINES TEMPLATE:');
      console.log('----------------------');
      console.log(agent.guidelines_template);
    } else {
      console.log('❌ Nenhum agente encontrado');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

showAgentGuidelines();
