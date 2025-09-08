const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3349,
  user: 'meli',
  password: '7dd3e59ddb3c3a5da0e3',
  database: 'meli',
  timezone: '-03:00',
  charset: 'utf8mb4',
};

async function fixOpenAIConfig() {
  let connection;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexão estabelecida');

    // 1. Verificar se a tabela system_config existe
    console.log('🔍 Verificando se a tabela system_config existe...');
    const [tables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'system_config'
    `, [dbConfig.database]);

    if (tables[0].count === 0) {
      console.log('📝 Criando tabela system_config...');
      await connection.execute(`
        CREATE TABLE system_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(255) NOT NULL UNIQUE,
          config_value TEXT,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabela system_config criada');
    } else {
      console.log('✅ Tabela system_config já existe');
    }

    // 2. Verificar se a chave openai_api_key existe
    console.log('🔍 Verificando se a chave openai_api_key existe...');
    const [configs] = await connection.execute(`
      SELECT * FROM system_config WHERE config_key = 'openai_api_key'
    `);

    if (configs.length === 0) {
      console.log('📝 Inserindo chave openai_api_key...');
      await connection.execute(`
        INSERT INTO system_config (config_key, config_value, description) 
        VALUES ('openai_api_key', '', 'Chave da API OpenAI para geração de descrições')
      `);
      console.log('✅ Chave openai_api_key inserida (vazia - precisa ser configurada)');
    } else {
      console.log('✅ Chave openai_api_key já existe');
      console.log('📊 Valor atual:', configs[0].config_value ? 'Configurada' : 'Vazia');
    }

    // 3. Verificar se a tabela meli existe
    console.log('🔍 Verificando se a tabela meli existe...');
    const [meliTables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'meli'
    `, [dbConfig.database]);

    if (meliTables[0].count === 0) {
      console.log('📝 Criando tabela meli...');
      await connection.execute(`
        CREATE TABLE meli (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          clothing_type VARCHAR(100),
          sleeve_type VARCHAR(50),
          gender VARCHAR(50),
          color VARCHAR(100),
          modelo TEXT,
          seller_sku VARCHAR(255),
          wedge_shape VARCHAR(50),
          is_sportive VARCHAR(10),
          main_color VARCHAR(100),
          item_condition VARCHAR(50),
          brand VARCHAR(255),
          agent_used VARCHAR(100),
          model_used VARCHAR(100),
          tokens_used INT DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          UNIQUE KEY unique_product_meli (product_id)
        )
      `);
      console.log('✅ Tabela meli criada');
    } else {
      console.log('✅ Tabela meli já existe');
    }

    // 4. Verificar se a tabela image_analysis_logs existe
    console.log('🔍 Verificando se a tabela image_analysis_logs existe...');
    const [analysisTables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'image_analysis_logs'
    `, [dbConfig.database]);

    if (analysisTables[0].count === 0) {
      console.log('📝 Criando tabela image_analysis_logs...');
      await connection.execute(`
        CREATE TABLE image_analysis_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          agent_id INT,
          contextual_analysis TEXT,
          technical_analysis TEXT,
          color_analysis TEXT,
          style_analysis TEXT,
          quality_analysis TEXT,
          recommendations TEXT,
          tokens_used INT DEFAULT 0,
          processing_time_ms INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
        )
      `);
      console.log('✅ Tabela image_analysis_logs criada');
    } else {
      console.log('✅ Tabela image_analysis_logs já existe');
    }

    // 5. Verificar se a tabela agents existe
    console.log('🔍 Verificando se a tabela agents existe...');
    const [agentTables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'agents'
    `, [dbConfig.database]);

    if (agentTables[0].count === 0) {
      console.log('📝 Criando tabela agents...');
      await connection.execute(`
        CREATE TABLE agents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          model VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Inserir agente padrão
      await connection.execute(`
        INSERT INTO agents (name, description, model) 
        VALUES ('Agente Marketplace', 'Agente especializado em geração de descrições para Marketplace', 'gpt-4o-mini')
      `);
      console.log('✅ Tabela agents criada com agente padrão');
    } else {
      console.log('✅ Tabela agents já existe');
    }

    console.log('🎉 Configuração do banco de dados concluída com sucesso!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Configure a chave da API OpenAI em: Configurações > IA');
    console.log('2. Teste a geração de descrições do Marketplace');
    console.log('3. Verifique se não há mais erros 500');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixOpenAIConfig();
