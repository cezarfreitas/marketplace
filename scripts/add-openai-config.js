const mysql = require('mysql2/promise');

async function addOpenAIConfig() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados remoto...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli'
    });

    console.log('✅ Conectado ao banco de dados remoto!');

    // Verificar se a configuração já existe
    const [existing] = await connection.execute(
      'SELECT config_key FROM system_config WHERE config_key = ?',
      ['openai_api_key']
    );

    if (existing.length > 0) {
      console.log('ℹ️ Configuração da OpenAI já existe no banco');
    } else {
      // Inserir configuração da OpenAI
      console.log('🔧 Adicionando configuração da OpenAI...');
      await connection.execute(`
        INSERT INTO system_config (config_key, config_value, description) 
        VALUES (?, ?, ?)
      `, ['openai_api_key', '', 'Chave da API da OpenAI para funcionalidades de IA']);
      console.log('✅ Configuração da OpenAI adicionada!');
    }

    // Verificar todas as configurações
    const [configs] = await connection.execute('SELECT config_key, description FROM system_config ORDER BY config_key');
    console.log('📊 Configurações disponíveis:');
    configs.forEach(config => {
      console.log(`  - ${config.config_key}: ${config.description}`);
    });

    console.log('🎉 Configuração da OpenAI pronta para uso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

addOpenAIConfig();
