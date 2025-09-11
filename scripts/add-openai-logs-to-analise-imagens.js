const mysql = require('mysql2/promise');

async function addOpenAILogsToAnaliseImagens() {
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

    console.log('🔧 Adicionando colunas para logs da OpenAI...');
    
    // Lista de colunas para adicionar
    const columns = [
      { name: 'openai_model', type: 'VARCHAR(100)', comment: 'Modelo da OpenAI usado' },
      { name: 'openai_tokens_used', type: 'INT', comment: 'Número de tokens utilizados' },
      { name: 'openai_max_tokens', type: 'INT', comment: 'Máximo de tokens configurado' },
      { name: 'openai_temperature', type: 'DECIMAL(3,2)', comment: 'Temperatura configurada' },
      { name: 'openai_response_time_ms', type: 'INT', comment: 'Tempo de resposta da OpenAI em ms' },
      { name: 'analysis_duration_ms', type: 'INT', comment: 'Duração total da análise em ms' },
      { name: 'agent_id', type: 'INT', comment: 'ID do agente utilizado' },
      { name: 'agent_name', type: 'VARCHAR(255)', comment: 'Nome do agente utilizado' },
      { name: 'total_images', type: 'INT', comment: 'Total de imagens analisadas' },
      { name: 'valid_images', type: 'INT', comment: 'Número de imagens válidas' },
      { name: 'invalid_images', type: 'INT', comment: 'Número de imagens inválidas' },
      { name: 'product_type', type: 'VARCHAR(100)', comment: 'Tipo de produto detectado' },
      { name: 'analysis_quality', type: 'VARCHAR(50)', comment: 'Qualidade da análise' }
    ];
    
    // Adicionar cada coluna individualmente
    for (const column of columns) {
      try {
        await connection.execute(`
          ALTER TABLE analise_imagens 
          ADD COLUMN ${column.name} ${column.type} DEFAULT NULL COMMENT '${column.comment}'
        `);
        console.log(`✅ Coluna ${column.name} adicionada`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`ℹ️ Coluna ${column.name} já existe`);
        } else {
          console.error(`❌ Erro ao adicionar coluna ${column.name}:`, error.message);
        }
      }
    }
    
    console.log('✅ Colunas adicionadas com sucesso!');
    
    // Verificar a nova estrutura
    const [rows] = await connection.execute('DESCRIBE analise_imagens');
    console.log('\n📊 Nova estrutura da tabela analise_imagens:');
    console.table(rows);
    
    console.log('🎉 Tabela analise_imagens atualizada com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

addOpenAILogsToAnaliseImagens();
