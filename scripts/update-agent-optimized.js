const mysql = require('mysql2/promise');

async function updateAgentOptimized() {
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

    console.log('🔧 Atualizando agente com parâmetros otimizados...');
    
    // Atualizar o agente com parâmetros otimizados para velocidade
    await connection.execute(`
      UPDATE agents 
      SET 
        max_tokens = 800,
        temperature = 0.5,
        guidelines_template = 'Analise esta peça de vestuário e crie uma descrição técnica concisa (150-200 palavras). Foque nos aspectos principais: tipo de peça e modelagem, características principais (gola, mangas, estampa), material aparente e acabamentos, sugestão de uso. Seja objetivo e técnico, destacando os pontos mais relevantes para o consumidor.',
        updated_at = NOW()
      WHERE function_type = 'image_analysis' AND is_active = TRUE
    `);
    
    console.log('✅ Agente atualizado com parâmetros otimizados!');
    
    // Verificar a atualização
    const [agents] = await connection.execute(`
      SELECT id, name, model, max_tokens, temperature, guidelines_template 
      FROM agents 
      WHERE function_type = 'image_analysis' AND is_active = TRUE 
      LIMIT 1
    `);
    
    if (agents.length > 0) {
      console.log('\n📊 Agente atualizado:');
      console.table(agents);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

updateAgentOptimized();
