import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto é obrigatório'
      }, { status: 400 });
    }

    // Buscar análise existente
    const analysis = await executeQuery(`
      SELECT 
        ai.*,
        p.name as product_name,
        p.title as product_title
      FROM analise_imagens ai
      INNER JOIN products_vtex p ON ai.id_produto_vtex = p.id_produto_vtex
      WHERE ai.id_produto_vtex = ?
      ORDER BY ai.created_at DESC
      LIMIT 1
    `, [productId]);

    if (!analysis || analysis.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma análise encontrada para este produto'
      }, { status: 404 });
    }

    const analysisData = analysis[0];
    
    console.log('🔍 Dados da análise carregada:', {
      total_images: analysisData.total_images,
      valid_images: analysisData.valid_images,
      image_count: analysisData.image_count
    });

    return NextResponse.json({
      success: true,
      data: {
        id: analysisData.id,
        productId: analysisData.id_produto_vtex,
        productName: analysisData.product_name,
        productTitle: analysisData.product_title,
        description: analysisData.contextualizacao || analysisData.descricao,
        characteristics: analysisData.caracteristicas ? JSON.parse(analysisData.caracteristicas) : null,
        imagesAnalyzed: analysisData.imagens_analisadas ? JSON.parse(analysisData.imagens_analisadas) : [],
        createdAt: analysisData.created_at,
        updatedAt: analysisData.updated_at,
        processingTime: analysisData.tempo_processamento,
        model: analysisData.openai_model || analysisData.modelo_ia,
        agentId: analysisData.agent_id,
        analysis: {
          image_count: analysisData.total_images || analysisData.valid_images || 0,
          total_images: analysisData.total_images || analysisData.valid_images || 0,
          contextual_analysis: analysisData.contextualizacao || analysisData.descricao
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar análise existente:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }


    const { productId, timestamp, forceNewAnalysis, categoryVtexId } = await request.json();

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto é obrigatório'
      }, { status: 400 });
    }

    if (!categoryVtexId) {
      return NextResponse.json({
        success: false,
        message: 'categoryVtexId é obrigatório'
      }, { status: 400 });
    }

    // Configurações do agente de análise de imagem (hardcoded)
    const agent = {
      id: 1,
      name: 'Image Analysis Agent',
      system_prompt: `Você é um especialista em moda, design têxtil e análise de vestuário com mais de 15 anos de experiência. Sua tarefa é analisar imagens de roupas e produzir uma descrição técnica detalhada e contextualizada, como se estivesse explicando cada elemento do produto a um comprador profissional ou a uma equipe de cadastro de e-commerce. Você deve atuar como um consultor técnico especializado em análise de produtos têxteis.`,
      guidelines_template: `⚠️ INSTRUÇÕES CRÍTICAS PARA ANÁLISE TÉCNICA:

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
- Contextualize cada observação com base visual`,
      model: 'gpt-4o',
      max_tokens: 8000,
      temperature: 0.3
    };

    // Buscar imagens do produto através dos SKUs (máximo 2 imagens - apenas as duas primeiras)
    const images = await executeQuery(`
      SELECT i.id_photo_vtex as id, i.file_location, i.text as alt_text, i.is_main as is_primary, i.id_sku_vtex as sku_id, i.name, i.label
      FROM images_vtex i
      INNER JOIN skus_vtex s ON i.id_sku_vtex = s.id_sku_vtex
      WHERE s.id_produto_vtex = ?
      ORDER BY i.is_main DESC, i.id_photo_vtex ASC
      LIMIT 2
    `, [productId]);

    if (!images || images.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma imagem encontrada para este produto'
      }, { status: 404 });
    }

    // Log da quantidade de imagens encontradas (máximo 2 para análise)
    console.log(`📊 Imagens encontradas para análise: ${images.length} (máximo 2 imagens processadas)`);

    // Processar URLs das imagens (sem validação)
    const validImages = images.map(img => ({
      ...img,
      url: img.file_location.startsWith('https://') 
        ? img.file_location 
        : img.file_location,
      valid: true
    }));

    console.log(`📊 ValidImages.length que será salvo: ${validImages.length}`);


    // Função para analisar imagens com OpenAI
    const analyzeImagesWithOpenAI = async (images: any[], productInfo: any, characteristics: any[], attributes: any[]) => {
      try {
        // Buscar chave da OpenAI das variáveis de ambiente
        const openaiApiKey = process.env.OPENAI_API_KEY;
        
        if (!openaiApiKey || openaiApiKey.trim() === '') {
          console.log('⚠️ Chave da OpenAI não configurada no .env');
          return null;
        }
        
        
        // Preparar perguntas das características ativas
        let characteristicsQuestions = '';
        if (characteristics && characteristics.length > 0) {
          characteristicsQuestions = `

**CARACTERÍSTICAS ESPECÍFICAS PARA IDENTIFICAR:**
${characteristics.map((c, index) => {
  let question = `\n**${index + 1}. ${c.caracteristica}:**\n`;
  question += `   ${c.pergunta_ia}\n`;
  if (c.valores_possiveis) {
    question += `   \n   **INSTRUÇÃO OBRIGATÓRIA:**\n   ${c.valores_possiveis}\n`;
  }
  question += `   \n   **RESPOSTA REQUERIDA:**\n`;
  question += `   - Analise as imagens e responda DIRETAMENTE a pergunta\n`;
  question += `   - Siga EXATAMENTE a instrução fornecida\n`;
  question += `   - Seja OBJETIVO e DIRETO na resposta\n`;
  question += `   - NÃO faça descrições longas ou explicações desnecessárias\n`;
  return question;
}).join('\n')}

**INSTRUÇÕES FINAIS PARA CARACTERÍSTICAS:**
- Após sua análise contextual principal, responda DIRETAMENTE cada característica acima
- Para cada característica, dê uma resposta OBJETIVA e DIRETA
- Siga EXATAMENTE as instruções fornecidas na coluna "valores_possiveis"
- NÃO faça descrições longas ou explicações técnicas desnecessárias
- Seja CONCISO e DIRETO nas respostas
- Use formato markdown para as características: "### Características Específicas"
- Para cada característica, responda apenas: "**Nome da Característica:** Resposta direta"
- NÃO adicione frases de conclusão, resumo ou comentários gerais no final
- Termine diretamente após responder todas as características`;
        }

        // Preparar lista de atributos do produto
        let attributesInfo = '';
        if (attributes && attributes.length > 0) {
          attributesInfo = `

**ATRIBUTOS TÉCNICOS DO PRODUTO:**
${attributes.map(attr => {
  return `• ${attr.attribute_name}: ${attr.attribute_value}`;
}).join('\n')}

**INSTRUÇÕES PARA ATRIBUTOS TÉCNICOS:**
- Use essas informações técnicas para validar e complementar sua análise visual
- Correlacione os atributos técnicos com os detalhes visíveis nas imagens
- Se houver discrepância entre atributos e análise visual, priorize o que é visível nas imagens
- Use os atributos para dar respostas mais precisas sobre características do produto
- Combine análise visual com dados técnicos para máxima precisão`;
        }

        // Preparar mensagens para a API da OpenAI (otimizado para velocidade)
        const messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${agent.guidelines_template}

**DADOS COMPLETOS DO PRODUTO:**
Nome do Produto: ${productInfo.name}
Marca: ${productInfo.brand_name || 'N/A'}
Categoria: ${productInfo.category_name || 'N/A'}
Descrição: ${productInfo.description || 'N/A'}
Título: ${productInfo.title || 'N/A'}
Palavras-chave: ${productInfo.keywords || 'N/A'}
REF_ID: ${productInfo.ref_id || 'N/A'}${attributesInfo}

**INSTRUÇÃO FINAL CRÍTICA:**
Você DEVE produzir uma análise técnica EXTREMAMENTE DETALHADA seguindo RIGOROSAMENTE a estrutura de 9 pontos especificada. Você receberá até 2 imagens do produto para análise. Cada seção deve ser um parágrafo corrido e fluido, usando terminologia técnica específica da moda e têxtil. NÃO use bullets, listas ou formatação JSON. Seja um especialista técnico analisando cada detalhe visível nas imagens fornecidas.

**ESTRUTURA OBRIGATÓRIA DA RESPOSTA:**
1. **ANÁLISE TÉCNICA PRINCIPAL**: Produza uma descrição técnica completa seguindo EXATAMENTE os 9 pontos especificados, cada um em parágrafo corrido detalhado
2. **RESPOSTAS TÉCNICAS**: Responda DIRETAMENTE cada característica listada abaixo com precisão técnica
3. **TOM OBRIGATÓRIO**: Mantenha linguagem de relatório técnico de moda profissional
4. **FORMATO OBRIGATÓRIO**: Use EXCLUSIVAMENTE parágrafos corridos para análise principal

**LEMBRE-SE**: Você é um especialista com 15+ anos de experiência. Seja extremamente detalhado, técnico e preciso. Priorize qualidade técnica sobre brevidade.

${characteristicsQuestions}`
              },
              ...images.map(img => ({
                type: "image_url",
                image_url: {
                  url: img.url,
                  detail: "high"
                }
              }))
            ]
          }
        ];

        // Fazer chamada para a API da OpenAI com modelo evoluído
        const openaiStartTime = Date.now();
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: agent.model, // Modelo configurado no agente
            messages: messages,
            max_tokens: agent.max_tokens, // Tokens configurados no agente
            temperature: agent.temperature, // Temperatura configurada no agente
            top_p: 0.9,
            frequency_penalty: 0.1,
            presence_penalty: 0.1
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erro na API da OpenAI:', response.status, response.statusText);
          console.error('❌ Detalhes do erro:', errorText);
          console.error('❌ URL da requisição:', 'https://api.openai.com/v1/chat/completions');
          console.error('❌ Chave API (primeiros 10 chars):', openaiApiKey.substring(0, 10) + '...');
          return null;
        }

        const result = await response.json();
        const openaiEndTime = Date.now();
        const analysis = result.choices[0]?.message?.content;

        if (analysis) {
          
          // Calcular custo baseado no modelo e tokens
          const calculateOpenAICost = (tokens: number, model: string): number => {
            const pricing: { [key: string]: { input: number; output: number } } = {
              'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
              'gpt-4o': { input: 0.005, output: 0.015 },
              'gpt-4-turbo': { input: 0.01, output: 0.03 },
              'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
            };
            
            const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
            const inputTokens = result.usage?.prompt_tokens || Math.floor(tokens * 0.7);
            const outputTokens = result.usage?.completion_tokens || Math.floor(tokens * 0.3);
            
            const inputCost = (inputTokens / 1000) * modelPricing.input;
            const outputCost = (outputTokens / 1000) * modelPricing.output;
            
            return inputCost + outputCost;
          };
          
          const modelUsed = agent.model;
          const totalTokens = result.usage?.total_tokens || 0;
          const promptTokens = result.usage?.prompt_tokens || Math.floor(totalTokens * 0.7);
          const completionTokens = result.usage?.completion_tokens || Math.floor(totalTokens * 0.3);
          const cost = calculateOpenAICost(totalTokens, modelUsed);
          
          return {
            openai_analysis: analysis,
            model_used: modelUsed,
            tokens_used: totalTokens,
            tokens_prompt: promptTokens,
            tokens_completion: completionTokens,
            cost: cost,
            request_id: result.id || '',
            response_time_ms: openaiEndTime - openaiStartTime
          };
        }

        return null;
      } catch (error) {
        console.error('❌ Erro ao analisar com OpenAI:', error);
        return null;
      }
    };

    // Buscar informações completas do produto
    const products = await executeQuery(`
      SELECT 
        p.id_produto_vtex as id, p.name, p.title, p.description, p.id_brand_vtex as brand_id, p.id_category_vtex as category_id, p.ref_produto as ref_id, p.keywords
      FROM products_vtex p
      WHERE p.id_produto_vtex = ?
    `, [productId]);

    // Buscar atributos do produto
    const productAttributes = await executeQuery(`
      SELECT attribute_name, attribute_value
      FROM product_attributes_vtex
      WHERE id_product_vtex = ?
      ORDER BY attribute_name
    `, [productId]);

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const product = products[0];

    // Buscar características ativas que se aplicam à categoria do produto
    const characteristics = await executeQuery(`
      SELECT caracteristica, pergunta_ia, valores_possiveis 
      FROM caracteristicas 
      WHERE is_active = TRUE 
        AND categorias IS NOT NULL 
        AND categorias != '' 
        AND TRIM(categorias) != ''
        AND FIND_IN_SET(?, categorias) > 0
      ORDER BY caracteristica
    `, [categoryVtexId]);

    // Verificar se existem características configuradas para esta categoria
    if (!characteristics || characteristics.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Nenhuma característica está configurada para a categoria "ID: ${categoryVtexId}". Configure as características para esta categoria primeiro.`
      }, { status: 400 });
    }

    // Analisar imagens com OpenAI (obrigatório)
    const openaiAnalysis = await analyzeImagesWithOpenAI(validImages, product, characteristics, productAttributes);

    // Verificar se a análise da OpenAI foi bem-sucedida
    if (!openaiAnalysis) {
      return NextResponse.json({
        success: false,
        message: 'Falha na análise com OpenAI. Configure a chave OPENAI_API_KEY no arquivo .env e tente novamente.'
      }, { status: 500 });
    }

    // Preparar dados para análise
    const analysisData = {
      product: {
        id: product.id,
        name: product.name,
        title: product.title,
        description: product.description
      },
      images: validImages.map(img => ({
        id: img.id,
        url: img.url,
        alt_text: img.alt_text,
        is_primary: img.is_primary,
        name: img.name,
        label: img.label,
        valid: img.valid
      })),
      invalid_images: [],
      agent: {
        id: agent.id,
        name: agent.name,
        system_prompt: agent.system_prompt,
        guidelines_template: agent.guidelines_template,
        model: agent.model,
        max_tokens: agent.max_tokens,
        temperature: agent.temperature
      }
    };

    // Qualidade de análise otimizada
    const analysisQuality = { level: 'média-alta', description: 'Análise técnica otimizada com GPT-4o-mini' };

    // Detectar tipo de produto simples
    const productName = product.name.toLowerCase();
    let productType = 'produto';
    if (productName.includes('camiseta')) productType = 'camiseta';
    else if (productName.includes('calça')) productType = 'calça';
    else if (productName.includes('vestido')) productType = 'vestido';
    else if (productName.includes('moletom')) productType = 'moletom';
    else if (productName.includes('jaqueta')) productType = 'jaqueta';
    
    // Usar apenas a análise da OpenAI
    const finalAnalysis = openaiAnalysis.openai_analysis;
    
    // Análise simplificada das imagens
    const detailedAnalysis = {
      product_type: productType,
      image_count: validImages.length,
      invalid_image_count: 0,
      contextual_analysis: finalAnalysis,
      analysis_quality: analysisQuality,
      agent_configuration: {
        model: agent.model,
        max_tokens: agent.max_tokens,
        temperature: agent.temperature,
        quality_level: analysisQuality.level,
        quality_description: analysisQuality.description
      },
      openai_analysis: openaiAnalysis,
      image_analysis: {
        total_images: validImages.length,
        valid_images: validImages.length,
        invalid_images: 0,
        lighting: "Iluminação profissional adequada",
        clarity: "Alta resolução e nitidez",
        angles: validImages.length > 1 ? "Múltiplos ângulos de visualização" : "Visualização única",
        background: "Fundo neutro profissional",
        composition: "Composição equilibrada e atrativa"
      }
    };

    // Salvar dados da análise na tabela de logs (simplificado)
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // Comentado temporariamente até verificar estrutura da tabela image_analysis_logs
    // try {
    //   await executeQuery(`
    //     INSERT INTO image_analysis_logs (
    //       id_produto_vtex, product_ref_id, agent_id, analysis_type, model_used, tokens_used, max_tokens, temperature,
    //       analysis_quality, total_images, valid_images, invalid_images, product_type,
    //       analysis_duration_ms, openai_response_time_ms, success, analysis_text
    //     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    //   `, [
    //     productId,
    //     product.ref_id || null,
    //     agent.id,
    //     'openai',
    //     'gpt-4o-mini',
    //     openaiAnalysis.tokens_used,
    //     parseInt(agent.max_tokens) || 2000,
    //     parseFloat(agent.temperature) || 0.7,
    //     analysisQuality.level,
    //     validImages.length,
    //     validImages.length,
    //     0,
    //     productType,
    //     totalDuration,
    //     openaiAnalysis.response_time_ms,
    //     true,
    //     finalAnalysis
    //   ]);
    // } catch (logError) {
    //   console.error('⚠️ Erro ao salvar logs da análise:', logError);
    //   // Não falhar a análise por erro de log
    // }

    // Salvar contextualização e logs da OpenAI na tabela analise_imagens
    try {
      
      // Verificar se já existe uma análise para este produto
      const existingAnalysis = await executeQuery(`
        SELECT id_produto_vtex FROM analise_imagens WHERE id_produto_vtex = ?
      `, [productId]);
      
      if (existingAnalysis && existingAnalysis.length > 0) {
        // Atualizar análise existente com todos os dados
        await executeQuery(`
          UPDATE analise_imagens 
          SET 
            contextualizacao = ?,
            openai_model = ?,
            openai_tokens_used = ?,
            openai_tokens_prompt = ?,
            openai_tokens_completion = ?,
            openai_cost = ?,
            openai_request_id = ?,
            openai_max_tokens = ?,
            openai_temperature = ?,
            openai_response_time_ms = ?,
            analysis_duration_ms = ?,
            agent_id = ?,
            agent_name = ?,
            total_images = ?,
            valid_images = ?,
            invalid_images = ?,
            product_type = ?,
            analysis_quality = ?,
            status = ?,
            generated_at = ?,
            updated_at = NOW()
          WHERE id_produto_vtex = ?
        `, [
          finalAnalysis,
          openaiAnalysis.model_used,
          openaiAnalysis.tokens_used,
          openaiAnalysis.tokens_prompt || Math.floor(openaiAnalysis.tokens_used * 0.7),
          openaiAnalysis.tokens_completion || Math.floor(openaiAnalysis.tokens_used * 0.3),
          openaiAnalysis.cost || 0,
          openaiAnalysis.request_id || '',
          agent.max_tokens,
          agent.temperature,
          openaiAnalysis.response_time_ms,
          totalDuration,
          agent.id,
          agent.name,
          validImages.length,
          validImages.length,
          0,
          productType,
          analysisQuality.level,
          'generated',
          new Date(),
          productId
        ]);
      } else {
        // Inserir nova análise com todos os dados
        await executeQuery(`
          INSERT INTO analise_imagens (
            id_produto_vtex, contextualizacao, openai_model, openai_tokens_used, 
            openai_tokens_prompt, openai_tokens_completion, openai_cost,
            openai_request_id, openai_max_tokens, openai_temperature, 
            openai_response_time_ms, analysis_duration_ms, agent_id, agent_name, 
            total_images, valid_images, invalid_images, product_type, 
            analysis_quality, status, generated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          productId,
          finalAnalysis,
          openaiAnalysis.model_used,
          openaiAnalysis.tokens_used,
          openaiAnalysis.tokens_prompt || Math.floor(openaiAnalysis.tokens_used * 0.7),
          openaiAnalysis.tokens_completion || Math.floor(openaiAnalysis.tokens_used * 0.3),
          openaiAnalysis.cost || 0,
          openaiAnalysis.request_id || '',
          agent.max_tokens,
          agent.temperature,
          openaiAnalysis.response_time_ms,
          totalDuration,
          agent.id,
          agent.name,
          validImages.length,
          validImages.length,
          0,
          productType,
          analysisQuality.level,
          'generated',
          new Date()
        ]);
      }
    } catch (analysisError) {
      console.error('⚠️ Erro ao salvar na tabela analise_imagens:', analysisError);
      // Não falhar a análise por erro de salvamento
    }

    return NextResponse.json({
      success: true,
      analysis: detailedAnalysis,
      product: analysisData.product,
      images: analysisData.images,
      invalid_images: [],
      agent_used: analysisData.agent.name,
      product_attributes: productAttributes || [],
      analysis_log: {
        duration_ms: totalDuration,
        openai_response_time_ms: openaiAnalysis.response_time_ms,
        tokens_used: openaiAnalysis.tokens_used,
        analysis_type: 'openai'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao analisar imagens:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
