const mysql = require('mysql2/promise');

async function updateAgentSimplifiedAnalysis() {
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

    // Novo prompt simplificado focado apenas na contextualização
    const newGuidelinesTemplate = `Você é um especialista em análise de produtos de moda e vestuário. Sua tarefa é analisar as imagens fornecidas e criar uma contextualização detalhada e envolvente do produto.

**INSTRUÇÕES PRINCIPAIS:**
- Analise cuidadosamente todas as imagens fornecidas
- Crie uma contextualização rica e detalhada do produto
- Use linguagem atrativa e comercial
- Foque nos aspectos visuais, estéticos e de estilo
- Mencione detalhes técnicos quando relevante
- Crie uma narrativa envolvente sobre o produto

**IMPORTANTE: GERE UMA CONTEXTUALIZAÇÃO DETALHADA DE MÍNIMO 300 PALAVRAS**

**ASPECTOS A CONSIDERAR:**
- Tipo de produto e modelagem
- Cores e estampas
- Estilo e ocasião de uso
- Detalhes técnicos (mangas, gola, bolsos, etc.)
- Qualidade aparente
- Público-alvo
- Tendências de moda
- Versatilidade do produto

**FORMATO DA RESPOSTA:**
Forneça apenas uma contextualização fluida e envolvente, sem dados estruturados, listas ou categorizações. O texto deve ser natural e comercial, como se fosse uma descrição para um catálogo de moda.`;

    // Atualizar o agente de análise de imagem
    console.log('🔄 Atualizando guidelines do agente de análise...');
    
    const [result] = await connection.execute(`
      UPDATE agents 
      SET 
        guidelines_template = ?,
        max_tokens = 3000,
        temperature = 0.3,
        updated_at = NOW()
      WHERE function_type = 'image_analysis' AND is_active = TRUE
    `, [newGuidelinesTemplate]);

    console.log(`✅ Agente atualizado. Linhas afetadas: ${result.affectedRows}`);

    // Verificar se a atualização foi bem-sucedida
    const [updatedAgent] = await connection.execute(`
      SELECT id, name, guidelines_template, max_tokens, temperature, updated_at
      FROM agents 
      WHERE function_type = 'image_analysis' AND is_active = TRUE
      LIMIT 1
    `);

    if (updatedAgent && updatedAgent.length > 0) {
      const agent = updatedAgent[0];
      console.log('\n📋 Agente atualizado:');
      console.log(`- ID: ${agent.id}`);
      console.log(`- Nome: ${agent.name}`);
      console.log(`- Max Tokens: ${agent.max_tokens}`);
      console.log(`- Temperature: ${agent.temperature}`);
      console.log(`- Atualizado em: ${agent.updated_at}`);
      console.log(`- Guidelines: ${agent.guidelines_template.substring(0, 100)}...`);
    }

    console.log('\n✅ Agente de análise simplificado configurado com sucesso!');
    console.log('💡 Agora a análise focará apenas na contextualização detalhada, sem dados estruturados');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

updateAgentSimplifiedAnalysis();
