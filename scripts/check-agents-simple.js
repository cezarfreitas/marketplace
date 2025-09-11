const mysql = require('mysql2/promise');

async function checkAgentsSimple() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar estrutura da tabela
    const [structure] = await connection.execute('DESCRIBE agents');
    console.log('\n📊 Estrutura da tabela agents:');
    structure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${field.Key ? `[${field.Key}]` : ''}`);
    });

    // Verificar agentes existentes
    const [agents] = await connection.execute('SELECT * FROM agents');
    console.log(`\n🤖 Total de agentes: ${agents.length}`);
    
    if (agents.length > 0) {
      console.log('\nAgentes existentes:');
      agents.forEach(agent => {
        console.log(`  - ID: ${agent.id}, Nome: ${agent.name}`);
        if (agent.config) {
          try {
            const config = JSON.parse(agent.config);
            console.log(`    Config: ${JSON.stringify(config, null, 2)}`);
          } catch (e) {
            console.log(`    Config: ${agent.config}`);
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAgentsSimple();
