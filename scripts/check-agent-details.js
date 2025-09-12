const mysql = require('mysql2/promise');

async function checkAgentDetails() {
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

    // Verificar detalhes do agente de descrição
    console.log('🔍 Verificando agente de descrição (ID: 6)...');
    const [agent] = await connection.execute(`
      SELECT * FROM agents WHERE id = 6
    `);

    if (agent.length > 0) {
      const a = agent[0];
      console.log('\n📊 Detalhes do agente:');
      console.log(`   - ID: ${a.id}`);
      console.log(`   - Nome: ${a.name}`);
      console.log(`   - Tipo: ${a.function_type}`);
      console.log(`   - Modelo: ${a.model}`);
      console.log(`   - Max Tokens: ${a.max_tokens}`);
      console.log(`   - Temperature: ${a.temperature}`);
      console.log(`   - Ativo: ${a.is_active ? 'Sim' : 'Não'}`);
      console.log(`   - System Prompt: ${a.system_prompt ? 'Configurado' : 'NÃO CONFIGURADO'}`);
      console.log(`   - Guidelines Template: ${a.guidelines_template ? 'Configurado' : 'NÃO CONFIGURADO'}`);
      
      if (a.system_prompt) {
        console.log('\n📝 System Prompt (primeiros 200 caracteres):');
        console.log(`   ${a.system_prompt.substring(0, 200)}...`);
      }
      
      if (a.guidelines_template) {
        console.log('\n📋 Guidelines Template (primeiros 200 caracteres):');
        console.log(`   ${a.guidelines_template.substring(0, 200)}...`);
      }
    } else {
      console.log('❌ Agente não encontrado!');
    }

    // Verificar se há problemas com campos obrigatórios
    console.log('\n🔍 Verificando campos obrigatórios...');
    const [requiredCheck] = await connection.execute(`
      SELECT 
        id,
        name,
        function_type,
        model,
        max_tokens,
        temperature,
        system_prompt IS NOT NULL as has_system_prompt,
        guidelines_template IS NOT NULL as has_guidelines
      FROM agents 
      WHERE function_type = 'product_description'
    `);

    if (requiredCheck.length > 0) {
      console.log('\n📊 Verificação de campos obrigatórios:');
      requiredCheck.forEach(agent => {
        console.log(`\n   Agente ID ${agent.id} (${agent.name}):`);
        console.log(`   - function_type: ${agent.function_type ? '✅' : '❌'}`);
        console.log(`   - model: ${agent.model ? '✅' : '❌'}`);
        console.log(`   - max_tokens: ${agent.max_tokens ? '✅' : '❌'}`);
        console.log(`   - temperature: ${agent.temperature ? '✅' : '❌'}`);
        console.log(`   - system_prompt: ${agent.has_system_prompt ? '✅' : '❌'}`);
        console.log(`   - guidelines_template: ${agent.has_guidelines ? '✅' : '❌'}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAgentDetails();
