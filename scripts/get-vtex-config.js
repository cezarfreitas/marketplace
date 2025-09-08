// Buscar configurações VTEX da tabela system_config
const mysql = require('mysql2/promise');

async function getVtexConfig() {
  const dbConfig = {
    host: 'server.idenegociosdigitais.com.br',
    port: 3349,
    user: 'meli',
    password: '7dd3e59ddb3c3a5da0e3',
    database: 'meli',
    charset: 'utf8mb4'
  };
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Buscar configurações VTEX
    const [configs] = await connection.execute(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_key LIKE '%vtex%'
    `);
    
    console.log('🔐 Configurações VTEX encontradas:');
    configs.forEach(config => {
      console.log(`${config.config_key}: ${config.config_value}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

getVtexConfig();
