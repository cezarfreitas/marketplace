const mysql = require('mysql2/promise');

async function readAgent6() {
  let connection;
  
  try {
    // Carregar variáveis de ambiente
    const fs = require('fs');
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    connection = await mysql.createConnection({
      host: envVars.DB_HOST,
      user: envVars.DB_USER,
      password: envVars.DB_PASSWORD,
      database: envVars.DB_NAME,
      port: parseInt(envVars.DB_PORT) || 3306
    });

    console.log('🔗 Conectado ao banco de dados');

    // Ler o agente ID 6 completo
    const [agents] = await connection.execute(`
      SELECT id, name, function_type, system_prompt, guidelines_template, 
             max_tokens, temperature, is_active, created_at, updated_at
      FROM agents 
      WHERE id = 6
    `);

    if (agents.length === 0) {
      console.log('❌ Agente ID 6 não encontrado.');
      return;
    }

    const agent = agents[0];
    
    console.log('\n📋 AGENTE ID 6 - INFORMAÇÕES COMPLETAS:');
    console.log('=====================================');
    console.log(`ID: ${agent.id}`);
    console.log(`Nome: ${agent.name}`);
    console.log(`Função: ${agent.function_type}`);
    console.log(`Max Tokens: ${agent.max_tokens}`);
    console.log(`Temperature: ${agent.temperature}`);
    console.log(`Ativo: ${agent.is_active ? 'Sim' : 'Não'}`);
    console.log(`Criado: ${agent.created_at}`);
    console.log(`Atualizado: ${agent.updated_at}`);
    
    console.log('\n📝 SYSTEM PROMPT:');
    console.log('================');
    console.log(agent.system_prompt);
    
    console.log('\n📋 GUIDELINES TEMPLATE:');
    console.log('======================');
    console.log(agent.guidelines_template);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

// Executar
readAgent6();
