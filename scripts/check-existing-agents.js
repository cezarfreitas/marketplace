const mysql = require('mysql2/promise');
const fs = require('fs');

async function checkExistingAgents() {
  let connection;
  
  try {
    // Configurar conexão com o banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'meli_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔗 Conectado ao banco de dados MySQL');

    // Verificar agentes existentes
    console.log('\n📋 Agentes existentes:');
    const [agents] = await connection.execute(`
      SELECT id, name, function_type, is_active, created_at
      FROM agents 
      ORDER BY function_type, created_at DESC
    `);

    if (agents.length > 0) {
      console.table(agents);
      
      // Verificar especificamente agentes de descrição
      const descriptionAgents = agents.filter(agent => agent.function_type === 'product_description');
      
      if (descriptionAgents.length > 0) {
        console.log('\n🎯 Agentes de descrição encontrados:');
        console.table(descriptionAgents);
        
        const activeAgent = descriptionAgents.find(agent => agent.is_active === 1);
        if (activeAgent) {
          console.log(`\n✅ Agente ativo: ${activeAgent.name} (ID: ${activeAgent.id})`);
          console.log('💡 Vou atualizar este agente com a nova estrutura.');
        } else {
          console.log('\n⚠️ Nenhum agente de descrição está ativo.');
        }
      } else {
        console.log('\n❌ Nenhum agente de descrição encontrado.');
      }
    } else {
      console.log('❌ Nenhum agente encontrado no banco de dados.');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar agentes:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

// Executar
checkExistingAgents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Falha:', error.message);
    process.exit(1);
  });
