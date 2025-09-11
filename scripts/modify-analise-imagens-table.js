const mysql = require('mysql2/promise');

async function modifyAnaliseImagensTable() {
  let connection;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3342,
      user: 'seo_data',
      password: '54779042baaa70be95c0',
      database: 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // 1. Verificar estrutura atual da tabela
    console.log('🔍 Verificando estrutura atual da tabela analise_imagens...');
    const [currentStructure] = await connection.execute('DESCRIBE analise_imagens');
    console.log('📊 Estrutura atual:');
    console.table(currentStructure);

    // 2. Verificar dados existentes
    console.log('🔍 Verificando dados existentes...');
    const [existingData] = await connection.execute('SELECT COUNT(*) as total FROM analise_imagens');
    console.log('📊 Total de registros:', existingData[0].total);

    if (existingData[0].total > 0) {
      const [sampleData] = await connection.execute('SELECT * FROM analise_imagens LIMIT 3');
      console.log('📋 Dados de exemplo:');
      console.table(sampleData);
    }

    // 3. Fazer backup dos dados (criar tabela temporária)
    console.log('💾 Criando backup dos dados...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS analise_imagens_backup AS 
      SELECT * FROM analise_imagens
    `);
    console.log('✅ Backup criado na tabela analise_imagens_backup');

    // 4. Remover a tabela atual
    console.log('🗑️ Removendo tabela atual...');
    await connection.execute('DROP TABLE analise_imagens');
    console.log('✅ Tabela removida');

    // 5. Recriar a tabela sem a coluna id
    console.log('🔧 Recriando tabela sem coluna id...');
    await connection.execute(`
      CREATE TABLE analise_imagens (
        id_produto INT PRIMARY KEY COMMENT 'ID do produto (chave primária)',
        contextualizacao TEXT COMMENT 'Análise contextual das imagens',
        openai_model VARCHAR(100) COMMENT 'Modelo OpenAI utilizado',
        openai_tokens_used INT COMMENT 'Tokens utilizados na análise',
        openai_max_tokens INT COMMENT 'Máximo de tokens configurado',
        openai_temperature DECIMAL(3,2) COMMENT 'Temperatura do modelo',
        openai_response_time_ms INT COMMENT 'Tempo de resposta da OpenAI em ms',
        analysis_duration_ms INT COMMENT 'Duração total da análise em ms',
        agent_id INT COMMENT 'ID do agente utilizado',
        agent_name VARCHAR(255) COMMENT 'Nome do agente',
        total_images INT DEFAULT 0 COMMENT 'Total de imagens processadas',
        valid_images INT DEFAULT 0 COMMENT 'Imagens válidas processadas',
        invalid_images INT DEFAULT 0 COMMENT 'Imagens inválidas',
        product_type VARCHAR(100) COMMENT 'Tipo do produto',
        analysis_quality VARCHAR(50) COMMENT 'Qualidade da análise',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Índices para performance
        INDEX idx_agent_id (agent_id),
        INDEX idx_agent_name (agent_name),
        INDEX idx_product_type (product_type),
        INDEX idx_analysis_quality (analysis_quality),
        INDEX idx_created_at (created_at),
        
        -- Chave estrangeira para products_vtex
        FOREIGN KEY (id_produto) REFERENCES products_vtex(id) ON DELETE CASCADE
        
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Análises de imagens dos produtos - id_produto como chave primária'
    `);
    console.log('✅ Tabela recriada com sucesso');

    // 6. Restaurar os dados (sem a coluna id)
    console.log('📥 Restaurando dados...');
    await connection.execute(`
      INSERT INTO analise_imagens (
        id_produto, contextualizacao, openai_model, openai_tokens_used,
        openai_max_tokens, openai_temperature, openai_response_time_ms,
        analysis_duration_ms, agent_id, agent_name, total_images,
        valid_images, invalid_images, product_type, analysis_quality,
        created_at, updated_at
      )
      SELECT 
        id_produto, contextualizacao, openai_model, openai_tokens_used,
        openai_max_tokens, openai_temperature, openai_response_time_ms,
        analysis_duration_ms, agent_id, agent_name, total_images,
        valid_images, invalid_images, product_type, analysis_quality,
        created_at, updated_at
      FROM analise_imagens_backup
    `);
    console.log('✅ Dados restaurados');

    // 7. Verificar resultado
    console.log('🔍 Verificando nova estrutura...');
    const [newStructure] = await connection.execute('DESCRIBE analise_imagens');
    console.log('📊 Nova estrutura:');
    console.table(newStructure);

    const [newData] = await connection.execute('SELECT COUNT(*) as total FROM analise_imagens');
    console.log('📊 Total de registros após modificação:', newData[0].total);

    // 8. Verificar chave primária
    const [primaryKey] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'seo_data' 
      AND TABLE_NAME = 'analise_imagens' 
      AND CONSTRAINT_NAME = 'PRIMARY'
    `);
    console.log('🔑 Chave primária:', primaryKey[0]?.COLUMN_NAME);

    console.log('🎉 Modificação concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('❌ Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

modifyAnaliseImagensTable();
