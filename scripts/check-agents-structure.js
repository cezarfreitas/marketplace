const mysql = require('mysql2/promise');

async function checkAgentsStructure() {
  let connection;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar se a tabela agents existe
    console.log('🔍 Verificando se a tabela agents existe...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agents'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela agents não encontrada!');
      return;
    }
    
    console.log('✅ Tabela agents encontrada!');

    // Verificar estrutura da tabela
    console.log('\n📊 Estrutura da tabela agents:');
    const [structure] = await connection.execute('DESCRIBE agents');
    console.table(structure);

    // Verificar agentes existentes
    console.log('\n🤖 Agentes existentes:');
    const [agents] = await connection.execute('SELECT * FROM agents');
    
    if (agents.length > 0) {
      console.table(agents);
    } else {
      console.log('❌ Nenhum agente encontrado na tabela');
    }

    // Verificar se existe agente de marketplace
    console.log('\n🔍 Verificando agente de marketplace...');
    const [marketplaceAgents] = await connection.execute(`
      SELECT * FROM agents 
      WHERE name LIKE '%marketplace%' OR name LIKE '%Marketplace%'
    `);
    
    if (marketplaceAgents.length > 0) {
      console.log('✅ Agente de marketplace encontrado:');
      console.table(marketplaceAgents);
    } else {
      console.log('❌ Nenhum agente de marketplace encontrado');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkAgentsStructure();
