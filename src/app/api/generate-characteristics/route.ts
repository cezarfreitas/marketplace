import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto é obrigatório'
      }, { status: 400 });
    }

    const numericProductId = parseInt(productId);
    if (isNaN(numericProductId)) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto deve ser um número válido'
      }, { status: 400 });
    }

    console.log('🤖 Gerando características para produto ID:', numericProductId);

    // 1. Buscar dados do produto
    console.log('🔍 Buscando dados do produto...');
    let products;
    try {
      const productQuery = `
        SELECT 
          p.*,
          b.name as brand_name,
          c.name as category_name
        FROM products_vtex p
        LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
        LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
        WHERE p.id_produto_vtex = ?
      `;

      products = await executeQuery(productQuery, [numericProductId]);
      console.log('📊 Resultado da busca do produto:', products?.length || 0, 'registros');
    } catch (dbError) {
      console.error('❌ Erro ao buscar produto no banco:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar produto no banco de dados'
      }, { status: 500 });
    }
    
    if (!products || products.length === 0) {
      console.log('❌ Produto não encontrado');
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const product = products[0];
    console.log('📦 Produto encontrado:', product.name);

    // Buscar atributos do produto da tabela product_attributes_vtex
    let productAttributes = [];
    try {
      const productAttributesQuery = `
        SELECT attribute_name, attribute_value
        FROM product_attributes_vtex
        WHERE id_product_vtex = ?
        ORDER BY attribute_name
      `;
      productAttributes = await executeQuery(productAttributesQuery, [numericProductId]);
      console.log(`📋 ${productAttributes?.length || 0} atributos encontrados para o produto`);
    } catch (error) {
      console.log('⚠️ Erro ao buscar atributos do produto:', error);
      productAttributes = [];
    }

    // 2. Buscar análise de imagem
    console.log('🔍 Buscando análise de imagem...');
    let imageAnalysis = null;
    try {
      const analysisQuery = `
        SELECT 
          ai.*
        FROM analise_imagens ai
        WHERE ai.id_produto_vtex = ?
        ORDER BY ai.generated_at DESC
        LIMIT 1
      `;
      
      const analysisResult = await executeQuery(analysisQuery, [numericProductId]);
      if (analysisResult && analysisResult.length > 0) {
        imageAnalysis = analysisResult[0];
        console.log('🖼️ Análise de imagem encontrada');
      } else {
        console.log('⚠️ Nenhuma análise de imagem encontrada');
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar análise de imagem:', error);
    }

    // 3. Buscar descrição do marketplace
    console.log('🔍 Buscando descrição do marketplace...');
    let marketplaceDescription = null;
    try {
      const marketplaceQuery = `
        SELECT * FROM descriptions 
        WHERE id_product_vtex = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const marketplaceResult = await executeQuery(marketplaceQuery, [numericProductId]);
      if (marketplaceResult && marketplaceResult.length > 0) {
        marketplaceDescription = marketplaceResult[0];
        console.log('📝 Descrição do marketplace encontrada');
      } else {
        console.log('⚠️ Nenhuma descrição do marketplace encontrada');
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar descrição do marketplace:', error);
    }

    // 4. Buscar características ativas que se aplicam à categoria do produto
    console.log('🔍 Buscando características ativas para a categoria do produto...');
    let characteristics = [];
    try {
      // Verificar se o produto tem categoria
      if (!product.id_category_vtex) {
        console.log('⚠️ Produto não possui categoria definida');
        return NextResponse.json({
          success: false,
          message: 'Produto não possui categoria definida. Não é possível gerar características.'
        }, { status: 400 });
      }

      // Buscar características que se aplicam à categoria do produto
      const characteristicsQuery = `
        SELECT id, caracteristica, pergunta_ia, valores_possiveis
        FROM caracteristicas 
        WHERE is_active = 1 
        AND (
          categorias LIKE ? 
          OR categorias LIKE ?
          OR categorias LIKE ?
          OR categorias = ''
          OR categorias IS NULL
          OR categorias = '[]'
          OR categorias = '{}'
        )
        ORDER BY caracteristica
      `;
      
      const characteristicsResult = await executeQuery(characteristicsQuery, [
        `%${product.id_category_vtex}%`,
        `"${product.id_category_vtex}"`,
        `'${product.id_category_vtex}'`
      ]);
      characteristics = characteristicsResult || [];
      
      console.log(`📋 ${characteristics.length} características ativas encontradas para categoria ID ${product.id_category_vtex}`);
      
      if (!characteristics || characteristics.length === 0) {
        console.log('⚠️ Nenhuma característica configurada para esta categoria');
        return NextResponse.json({
          success: false,
          message: `Nenhuma característica está configurada para a categoria "${product.category_name || 'ID: ' + product.id_category_vtex}". Configure as características para esta categoria primeiro.`
        }, { status: 400 });
      }
      
      console.log(`📊 Encontradas ${characteristics.length} características ativas para esta categoria`);
    } catch (error) {
      console.log('⚠️ Erro ao buscar características:', error);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar características ativas'
      }, { status: 500 });
    }

    // 5. Configurar agente de características (hardcoded)
    console.log('🤖 Configurando agente de características...');
    const agent = {
      name: 'Agente Características Avançado',
      system_prompt: 'Você é um especialista sênior em análise técnica de produtos para e-commerce, com 20+ anos de experiência em moda, design, características visuais e especificações técnicas. Sua análise é precisa, detalhada e baseada em evidências visuais e textuais.',
      model: 'gpt-4.1-mini',
      max_tokens: 4000,
      temperature: 0.1
    };
    
    console.log(`🤖 Usando agente: ${agent.name} (Modelo: ${agent.model})`);

    // 6. Verificar se OpenAI API Key está configurada
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.log('❌ OpenAI API Key não configurada');
      return NextResponse.json({
        success: false,
        message: 'OpenAI API Key não configurada'
      }, { status: 500 });
    }

    // 7. Construir prompt para o agente evoluído
    const systemPrompt = `Você é um especialista sênior em análise técnica de produtos para e-commerce, com 20+ anos de experiência em moda, design, características visuais e especificações técnicas. Sua análise é precisa, detalhada e baseada em evidências visuais e textuais concretas.

🎯 METODOLOGIA DE ANÁLISE PROFISSIONAL:

**FASE 1: ANÁLISE VISUAL DETALHADA**
- Examine minuciosamente as imagens disponíveis
- Identifique cores, texturas, materiais, padrões e detalhes estruturais
- Observe acabamentos, costuras, aviamentos e elementos técnicos
- Analise modelagem, cortes, proporções e detalhes construtivos

**FASE 2: ANÁLISE TEXTUAL E DE DADOS**
- Correlacione informações textuais com evidências visuais
- Valide dados técnicos (atributos, especificações) com o que é visível
- Identifique padrões e nomenclaturas técnicas do setor
- Priorize informações concretas sobre suposições

**FASE 3: SÍNTESE E VALIDAÇÃO**
- Confirme cada característica com evidências múltiplas quando possível
- Use terminologia técnica precisa e específica do setor têxtil/moda
- Seja extremamente específico em cores, materiais e detalhes
- Evite generalidades - cada resposta deve ser única e aplicável ao produto

📋 REGRAS CRÍTICAS DE RESPOSTA:

1. **PRECISÃO ABSOLUTA**: Use apenas informações confirmadas visualmente ou textualmente
2. **ESPECIFICIDADE MÁXIMA**: 
   - Cores: Use nomenclatura técnica (ex: "Azul navy", "Off-white", "Preto carbono")
   - Materiais: Seja específico (ex: "Algodão 100% penteado", "Malha 65% poliéster 35% algodão")
   - Modelagem: Use termos técnicos (ex: "Oversized", "Slim fit", "Regular fit")
3. **N/A CRITERIOSO**: Use "N/A" SOMENTE quando genuinamente impossível identificar
4. **EVIDÊNCIA PRIORITÁRIA**: Priorize informações visíveis > dados técnicos > descrições textuais
5. **SEM INVENÇÃO**: NUNCA invente, assuma ou especule características
6. **TERMINOLOGIA PROFISSIONAL**: Use vocabulário técnico da indústria têxtil e de moda

🔍 DIRETRIZES POR TIPO DE CARACTERÍSTICA:

**CORES:**
- Identifique tons exatos: "Azul marinho", "Verde militar", "Cinza mescla"
- Para múltiplas cores: Liste em ordem de predominância
- Considere variações: "Preto com detalhes brancos"

**MATERIAIS:**
- Especifique composição quando visível/mencionada
- Use gramatura se disponível: "Moletom 280g/m²"
- Identifique texturas: "Malha lisa", "Moletom felpudo", "Tecido canelado"

**MODELAGEM:**
- Use termos técnicos: "Corte reto", "Modelagem oversized", "Ajuste slim"
- Descreva caimento: "Amplo", "Justo", "Regular"
- Especifique detalhes: "Gola redonda", "Manga raglan", "Capuz ajustável"

**PÚBLICO-ALVO:**
- Seja específico: "Masculino", "Feminino", "Unissex", "Infantil"
- Considere idade se aplicável: "Adulto", "Jovem"
- Baseie-se em modelagem, cortes e proporções visíveis

**CARACTERÍSTICAS TÉCNICAS:**
- Identifique fechamentos: "Zíper frontal", "Botões de pressão"
- Descreva bolsos: "2 bolsos laterais", "Bolso canguru"
- Note acabamentos: "Barra com elástico", "Punhos em ribana"

📊 FORMATO OBRIGATÓRIO DE RESPOSTA (JSON):

{
  "respostas": [
    {
      "caracteristica": "Nome da Característica",
      "resposta": "Resposta técnica específica e precisa (ou N/A se impossível identificar com confiança)"
    }
  ]
}

⚠️ LEMBRE-SE:
- Cada resposta deve ser ÚNICA e ESPECÍFICA para ESTE produto
- Use terminologia que um profissional técnico de moda usaria
- Qualidade > Velocidade: prefira precisão a suposições
- Se houver dúvida: seja conservador e use "N/A"

${agent.system_prompt || ''}`;

    // Preparar lista de atributos do produto
    let attributesInfo = '';
    if (productAttributes && productAttributes.length > 0) {
      attributesInfo = `

=== ATRIBUTOS TÉCNICOS DO PRODUTO ===
${productAttributes.map(attr => {
  const values = typeof attr.attribute_values === 'string' 
    ? JSON.parse(attr.attribute_values) 
    : attr.attribute_values;
  const valuesList = Array.isArray(values) ? values.join(', ') : values;
  return `• ${attr.attribute_name}: ${valuesList}`;
}).join('\n')}`;
    }

    const userPrompt = `=== INFORMAÇÕES DO PRODUTO ===
Nome: ${product.name}
Ref ID: ${product.ref_id || 'N/A'}
Marca: ${product.brand_name || 'N/A'}
Categoria: ${product.category_name || 'N/A'}
Descrição: ${product.description || 'N/A'}${attributesInfo}

=== ANÁLISE DE IMAGEM ===
${imageAnalysis ? imageAnalysis.contextualizacao || 'Análise disponível' : 'Não disponível'}

=== DESCRIÇÃO DO MARKETPLACE ===
${marketplaceDescription ? `
Título: ${marketplaceDescription.title}
Descrição: ${marketplaceDescription.description}
` : 'Não disponível'}

=== INSTRUÇÕES DE ANÁLISE ===
Analise cuidadosamente TODAS as informações disponíveis acima. Para cada característica solicitada:

1. **Identifique se a informação está disponível** nas imagens, descrições ou dados do produto
2. **Se a informação estiver clara e específica**, forneça uma resposta precisa
3. **Se a informação não estiver disponível ou for ambígua**, use "N/A"
4. **Seja específico**: evite respostas genéricas como "pode variar" ou "depende"
5. **Use terminologia técnica apropriada** para o tipo de produto

=== CARACTERÍSTICAS A SEREM RESPONDIDAS ===
${characteristics.map((char: any) => 
  `${char.id}. ${char.caracteristica}: ${char.pergunta_ia}
   Valores possíveis: ${char.valores_possiveis || 'N/A'}
   Instrução: ${char.pergunta_ia.includes('cor') ? 'Identifique a cor específica visível nas imagens' : 
              char.pergunta_ia.includes('material') ? 'Identifique o material específico mencionado' :
              char.pergunta_ia.includes('tamanho') ? 'Identifique o tamanho específico disponível' :
              'Analise cuidadosamente a característica solicitada'}`
).join('\n\n')}

=== FORMATO DE RESPOSTA OBRIGATÓRIO ===
Responda no formato JSON exato abaixo, preenchendo uma resposta para cada uma das ${characteristics.length} características:

{
  "respostas": [
${characteristics.map((char: any, index: number) => 
    `    {
      "caracteristica": "${char.caracteristica}",
      "resposta": "RESPONDA AQUI PARA ${char.caracteristica} OU N/A SE NÃO IDENTIFICÁVEL"
    }${index < characteristics.length - 1 ? ',' : ''}`
).join('\n')}
  ]
}

IMPORTANTE: 
- Responda TODAS as ${characteristics.length} características
- Use exatamente os nomes das características como mostrado
- Retorne apenas o JSON, sem texto adicional
- Use "N/A" se não conseguir identificar a característica com confiança
- Seja específico e preciso nas respostas
`;

    console.log('🌐 Chamando API da OpenAI para características...');
    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: agent.max_tokens,
        temperature: agent.temperature,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro na API OpenAI para características:', response.status, errorData);
      throw new Error(`Erro na API OpenAI: ${response.status}`);
    }

    const responseData = await response.json();
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log('✅ Resposta das características recebida');
    console.log(`⏱️ Tempo de resposta: ${responseTime}ms`);

    const content = responseData.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    console.log('📄 Conteúdo bruto da resposta:', content);
    console.log('📄 Tamanho da resposta:', content.length, 'caracteres');
    
    const parsedContent = JSON.parse(content);
    console.log('📋 Conteúdo parseado:', JSON.stringify(parsedContent, null, 2));
    console.log('📋 Tipo do objeto:', typeof parsedContent);
    console.log('📋 Chaves do objeto:', Object.keys(parsedContent));
    
    const respostas = parsedContent.respostas || [];

    console.log(`📊 Respostas geradas: ${respostas.length}`);
    console.log(`📊 Características esperadas: ${characteristics.length}`);
    console.log(`📊 Respostas detalhadas:`, JSON.stringify(respostas, null, 2));

    // Validar se todas as características foram respondidas
    const caracteristicasRespondidas = respostas.map((r: any) => r.caracteristica);
    const caracteristicasEsperadas = characteristics.map(c => c.caracteristica);
    const caracteristicasFaltando = caracteristicasEsperadas.filter(c => !caracteristicasRespondidas.includes(c));
    
    console.log(`📊 Características esperadas: ${caracteristicasEsperadas.join(', ')}`);
    console.log(`📊 Características respondidas: ${caracteristicasRespondidas.join(', ')}`);
    
    if (caracteristicasFaltando.length > 0) {
      console.warn(`⚠️ Características não respondidas: ${caracteristicasFaltando.join(', ')}`);
      console.warn(`⚠️ Apenas ${respostas.length} de ${characteristics.length} características foram respondidas`);
    } else {
      console.log(`✅ Todas as ${characteristics.length} características foram respondidas`);
    }
    
    // Se não há respostas, não continuar
    if (respostas.length === 0) {
      console.error(`❌ Nenhuma resposta foi gerada pela IA`);
      console.log(`🔍 Vamos tentar salvar mesmo assim para debug...`);
    }

    // 8. Salvar respostas no banco
    let savedCount = 0;
    console.log(`🔄 Iniciando loop para salvar ${respostas.length} respostas...`);
    
    // Primeiro, deletar respostas existentes para este produto (regeneração)
    console.log(`🗑️ Deletando respostas existentes para produto ${numericProductId} (regeneração)...`);
    try {
      const deleteResult = await executeQuery(`DELETE FROM respostas_caracteristicas WHERE produto_id = ?`, [numericProductId]);
      console.log(`✅ Respostas existentes deletadas para produto ${numericProductId}`);
    } catch (deleteError) {
      console.error(`❌ Erro ao deletar respostas existentes:`, deleteError);
      // Continuar mesmo com erro de delete, pois pode ser que não existam registros
    }
    
    // Filtrar e validar respostas antes de salvar
    const respostasValidas = respostas.filter((resposta: any) => {
      const respostaLimpa = resposta.resposta?.trim().toLowerCase();
      const isValida = respostaLimpa && 
                      respostaLimpa !== 'n/a' && 
                      respostaLimpa !== 'na' && 
                      respostaLimpa !== 'não disponível' &&
                      respostaLimpa !== 'não identificável' &&
                      respostaLimpa !== 'não aplicável' &&
                      respostaLimpa !== 'não se aplica' &&
                      respostaLimpa !== 'não especificado' &&
                      respostaLimpa !== 'não informado' &&
                      respostaLimpa !== 'não definido' &&
                      respostaLimpa !== 'não determinado' &&
                      respostaLimpa !== 'não identificado' &&
                      respostaLimpa !== 'não encontrado' &&
                      respostaLimpa !== 'não disponível' &&
                      respostaLimpa !== 'não aplicável' &&
                      respostaLimpa !== 'não se aplica' &&
                      respostaLimpa !== 'não especificado' &&
                      respostaLimpa !== 'não informado' &&
                      respostaLimpa !== 'não definido' &&
                      respostaLimpa !== 'não determinado' &&
                      respostaLimpa !== 'não identificado' &&
                      respostaLimpa !== 'não encontrado' &&
                      respostaLimpa.length > 2; // Evita respostas muito curtas
      
      if (!isValida) {
        console.log(`⚠️ Resposta filtrada para "${resposta.caracteristica}": "${resposta.resposta}" (considerada inválida)`);
      }
      
      return isValida;
    });

    console.log(`📊 Respostas válidas após filtro: ${respostasValidas.length} de ${respostas.length}`);

    // Agora inserir/atualizar apenas as respostas válidas
    for (let i = 0; i < respostasValidas.length; i++) {
      const resposta = respostasValidas[i];
      console.log(`💾 [${i+1}/${respostasValidas.length}] Salvando/atualizando resposta para característica "${resposta.caracteristica}": "${resposta.resposta}"`);
      const upsertQuery = `
        INSERT INTO respostas_caracteristicas 
        (produto_id, caracteristica, resposta, tokens_usados, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        resposta = VALUES(resposta),
        tokens_usados = VALUES(tokens_usados),
        updated_at = NOW()
      `;
      
      try {
        await executeQuery(upsertQuery, [
          numericProductId,
          resposta.caracteristica,
          resposta.resposta,
          responseData.usage?.total_tokens || 0
        ]);
        console.log(`✅ Resposta salva/atualizada para característica ${resposta.caracteristica}`);
        savedCount++;
      } catch (insertError) {
        console.error(`❌ Erro ao salvar resposta para característica ${resposta.caracteristica}:`, insertError);
      }
    }

    console.log(`✅ ${savedCount} respostas das características salvas no banco`);
    
    return NextResponse.json({
      success: true,
      message: `Características geradas com sucesso! ${savedCount} respostas válidas salvas de ${respostas.length} geradas.`,
      data: {
        productId: numericProductId,
        productName: product.name,
        characteristicsGenerated: savedCount,
        totalCharacteristics: characteristics.length,
        totalResponsesGenerated: respostas.length,
        validResponses: respostasValidas.length,
        filteredResponses: respostas.length - respostasValidas.length,
        tokensUsed: responseData.usage?.total_tokens || 0,
        responseTime: responseTime,
        model: agent.model,
        qualityFilter: 'Aplicado - apenas respostas válidas e específicas foram salvas'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar características:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao gerar características',
      error: error.message
    }, { status: 500 });
  }
}
