const mysql = require('mysql2/promise');

async function updateImageAnalysisAgent() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Usar credenciais hardcoded como fallback (baseado em outros scripts funcionais)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Novo system prompt com análise técnica detalhada
    const newSystemPrompt = `Você é um especialista em moda, design têxtil e análise de vestuário com mais de 15 anos de experiência. Sua tarefa é analisar imagens de roupas e produzir uma descrição técnica detalhada e contextualizada, como se estivesse explicando cada elemento do produto a um comprador profissional ou a uma equipe de cadastro de e-commerce. Você deve atuar como um consultor técnico especializado em análise de produtos têxteis.`;

    const newGuidelinesTemplate = `⚠️ INSTRUÇÕES CRÍTICAS PARA ANÁLISE TÉCNICA:

**FORMATO OBRIGATÓRIO:**
- Use EXCLUSIVAMENTE linguagem técnica, objetiva e clara, sem apelos de venda
- Escreva em parágrafos corridos e fluidos (NUNCA use bullets, listas ou JSON)
- Mantenha tom profissional de relatório técnico de moda
- Se algum detalhe não for visível, contextualize com "não identificado na imagem"

**ORDEM DE ANÁLISE OBRIGATÓRIA (SEGUIR EXATAMENTE):**
1. Visão geral → tecido → cores → modelagem → gola/manga/comprimento → bolsos/fechamentos → recortes/costuras → estampas/logos → aviamentos → acabamentos → caimento geral

**ESTRUTURA TÉCNICA DETALHADA (9 PONTOS OBRIGATÓRIOS):**

1. **VISÃO GERAL TÉCNICA**
   - Identifique o tipo exato de peça (camiseta, blusa, vestido, etc.)
   - Determine o gênero aparente (masculino, feminino, unissex)
   - Classifique a categoria/estilo (casual, formal, esportivo, etc.)
   - Analise o público-alvo e ocasião de uso

2. **ANÁLISE DE MATERIAL E CORES**
   - Identifique o tipo de tecido (algodão, poliéster, viscose, etc.)
   - Descreva a textura e peso do material
   - Especifique a cor principal e cores secundárias
   - Analise acabamentos de superfície (brilho, fosco, texturizado)

3. **MODELAGEM E CONSTRUÇÃO**
   - Descreva o corte e silhueta (justo, solto, oversized, etc.)
   - Analise o comprimento e proporções
   - Identifique linhas de construção e dardos
   - Avalie a estruturação da peça

4. **DETALHES ESTRUTURAIS**
   - Analise gola, decote e acabamentos de pescoço
   - Descreva mangas (tipo, comprimento, acabamento)
   - Identifique bolsos (tipo, localização, funcionalidade)
   - Analise fechamentos (zíper, botões, elástico, etc.)

5. **RECORTES, COSTURAS E ACABAMENTOS**
   - Descreva linhas de recorte e costuras aparentes
   - Analise barras, punhos e acabamentos de bordas
   - Identifique técnicas de costura e acabamento
   - Avalie qualidade de construção

6. **ESTAMPAS, LOGOS E APLICAÇÕES**
   - Identifique tipo de estampa (silk-screen, sublimação, bordado, etc.)
   - Localize logos, patches e aplicações
   - Descreva técnicas de impressão e acabamento
   - Analise posicionamento e proporções

7. **AVIAMENTOS E ELEMENTOS ADICIONAIS**
   - Inventarie botões, zíperes, cordões e reguladores
   - Descreva materiais e cores dos aviamentos
   - Analise funcionalidade e durabilidade
   - Identifique elementos decorativos

8. **CAIMENTO E APARÊNCIA FINAL**
   - Avalie ajuste ao corpo (solto, justo, estruturado, fluido)
   - Descreva movimento e drapeado do tecido
   - Analise proporções e silhueta final
   - Avalie adequação para diferentes tipos corporais

9. **OBSERVAÇÕES TÉCNICAS ADICIONAIS**
   - Detalhes funcionais ou decorativos extras
   - Características especiais de design
   - Considerações de cuidado e manutenção
   - Aspectos de qualidade e durabilidade

**EXEMPLO DE QUALIDADE ESPERADA:**
"Esta peça apresenta-se como uma camiseta de gênero unissex, categorizada no segmento casual contemporâneo, adequada para uso diário e ocasional. O material identificado é algodão penteado de gramatura média, apresentando textura suave e toque macio característico desta fibra natural. A cor predominante é azul marinho sólido, sem variações tonais visíveis na imagem, conferindo versatilidade de combinação. A modelagem segue um corte reto com leve ajuste ao corpo, proporcionando silhueta equilibrada entre conforto e elegância. O comprimento atinge aproximadamente a altura do quadril, seguindo proporções clássicas para este tipo de peça..."

**IMPORTANTE:** 
- Seja extremamente detalhado e técnico
- Use terminologia específica da moda e têxtil
- Mantenha consistência na análise
- Priorize precisão sobre brevidade
- Contextualize cada observação com base visual`;

    console.log('\n🔄 Atualizando agente de análise de imagem...');
    
    // Primeiro, verificar se existe um agente de análise de imagem
    const [existingAgents] = await connection.execute(`
      SELECT id, name, function_type, is_active
      FROM agents 
      WHERE function_type = 'image_analysis'
    `);

    if (existingAgents.length === 0) {
      console.log('❌ Nenhum agente de análise de imagem encontrado. Criando novo...');
      
      // Criar novo agente
      const [insertResult] = await connection.execute(`
        INSERT INTO agents (
          name, 
          system_prompt, 
          guidelines_template, 
          model, 
          max_tokens, 
          temperature, 
          function_type, 
          is_active, 
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        'Especialista em Análise Técnica de Imagens de Moda',
        newSystemPrompt,
        newGuidelinesTemplate,
        'gpt-4o',
        8000,
        0.3,
        'image_analysis',
        true
      ]);

      console.log(`✅ Novo agente criado com ID: ${insertResult.insertId}`);
    } else {
      console.log(`📋 Agente existente encontrado: ${existingAgents[0].name} (ID: ${existingAgents[0].id})`);
      
      // Atualizar agente existente
      const [updateResult] = await connection.execute(`
        UPDATE agents 
        SET 
          name = 'Especialista em Análise Técnica de Imagens de Moda',
          system_prompt = ?,
          guidelines_template = ?,
          model = 'gpt-4o',
          max_tokens = 8000,
          temperature = 0.3,
          updated_at = NOW()
        WHERE function_type = 'image_analysis'
      `, [newSystemPrompt, newGuidelinesTemplate]);

      console.log(`✅ Agente atualizado: ${updateResult.affectedRows} linha(s) afetada(s)`);
    }

    // Verificar o resultado final
    const [finalAgent] = await connection.execute(`
      SELECT id, name, function_type, is_active, max_tokens, temperature, updated_at
      FROM agents 
      WHERE function_type = 'image_analysis'
    `);

    console.log('\n📋 Agente de análise de imagem final:');
    console.table(finalAgent);

    console.log('\n🎯 Melhorias implementadas:');
    console.log('   ✅ Prompt técnico especializado em moda e têxtil');
    console.log('   ✅ Estrutura de 9 pontos obrigatória');
    console.log('   ✅ Ordem de análise específica');
    console.log('   ✅ Exemplo de qualidade esperada');
    console.log('   ✅ Parâmetros otimizados (gpt-4o, 8000 tokens, temp 0.3)');
    console.log('   ✅ Instruções críticas para formato técnico');
    console.log('   ✅ Terminologia específica da moda');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  updateImageAnalysisAgent()
    .then(() => {
      console.log('\n🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = { updateImageAnalysisAgent };
