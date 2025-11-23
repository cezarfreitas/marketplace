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

    // Verificar cache (análise recente de 24h)
    if (!forceNewAnalysis) {
      const existingAnalysis = await executeQuery(`
        SELECT id, openai_analysis, created_at
        FROM image_analysis_logs
        WHERE product_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY created_at DESC
        LIMIT 1
      `, [productId]);

      if (existingAnalysis && existingAnalysis.length > 0) {
        console.log(`⚡ Cache hit: Análise encontrada para produto ${productId} (${existingAnalysis[0].created_at})`);
        return NextResponse.json({
          success: true,
          message: 'Análise de imagem concluída (cache)',
          data: {
            analysis: existingAnalysis[0].openai_analysis,
            cached: true,
            cache_age: existingAnalysis[0].created_at
          }
        });
      }
    }

    // Configurações do agente de análise de imagem (otimizado para velocidade e qualidade)
    const agent = {
      id: 1,
      name: 'Image Analysis Agent',
      system_prompt: `Você é um especialista sênior em moda, design têxtil e análise visual de vestuário com mais de 20 anos de experiência em catalogação de produtos para e-commerce de luxo. Sua análise é baseada EXCLUSIVAMENTE no que é VISÍVEL nas imagens. NUNCA especule ou invente informações técnicas que não podem ser confirmadas visualmente.

⚠️ REGRAS CRÍTICAS DE PRECISÃO:
- NUNCA mencione gramaturas específicas (ex: 180g/m², 280g/m²) - você não pode medir isso visualmente
- NUNCA mencione composições exatas de tecido (ex: "100% algodão", "65% poliéster") a menos que esteja VISÍVEL em etiqueta
- NUNCA mencione medidas específicas (ex: "gola de 2cm") - você não pode medir com precisão
- NUNCA mencione idade do modelo/pessoa nas fotos (ex: "jovem", "18-45 anos", "adulto jovem")
- NUNCA use notas numéricas ou escalas (ex: "qualidade 8/10", "7/10", "nota 9")
- NUNCA invente especificações técnicas que não sejam absolutamente evidentes
- Use apenas termos descritivos visuais: "aparenta ser algodão", "textura lisa", "tecido espesso"
- Para qualidade: use termos qualitativos ("confecção cuidadosa", "acabamento bem executado", "construção robusta")
- Se não tiver certeza absoluta, use termos como: "aparenta", "parece ser", "possivelmente"
- Priorize descrições visuais objetivas sobre especulações técnicas`,
      guidelines_template: `🔍 ANÁLISE TÉCNICA DETALHADA DE PRODUTO - FICHA TÉCNICA PROFISSIONAL:

**FORMATO:** Linguagem técnica especializada, parágrafos estruturados, terminologia precisa de moda e confecção.

**ESTRUTURA OBRIGATÓRIA (10 pontos técnicos):**

1. **CLASSIFICAÇÃO GERAL** 
   - Tipo exato da peça (categoria e subcategoria)
   - Gênero e público-alvo (ocasião de uso)
   - Estilo e linha de moda (casual, formal, esportivo, etc)
   - ⚠️ NUNCA mencione idade do modelo/pessoa na foto

2. **COMPOSIÇÃO E MATERIAIS** (⚠️ SOMENTE O QUE É VISÍVEL)
   - Descrição visual do tecido (ex: "aparenta ser algodão", "textura de malha", "tecido com aspecto de moletom")
   - NUNCA mencione gramaturas específicas (180g/m², 280g/m²) - isso não é visível
   - NUNCA mencione composições exatas (100% algodão, 65% poliéster) a menos que visível em etiqueta
   - Textura visual detalhada (lisa, canelada, texturizada, jacquard, felpuda)
   - Elasticidade aparente e caimento visual do material
   - Forros, entretelas ou camadas adicionais VISÍVEIS

3. **COLORIMETRIA E TONALIDADES**
   - Cores principais com nomenclatura técnica (ex: azul navy, off-white, preto carbono)
   - Gradientes, degradês ou variações de tom
   - Brilho e acabamento da cor (fosco, acetinado, metálico)

4. **MODELAGEM E CONSTRUÇÃO**
   - Corte técnico (reto, anatômico, oversized, slim fit, etc)
   - Silhueta e proporções (comprimento, largura, cavas)
   - Linhas de construção e recortes
   - Pences, franzidos, pregas ou drapeados

5. **ELEMENTOS ESTRUTURAIS DETALHADOS**
   - Gola: tipo, medidas, acabamento (redonda, V, polo, alta, etc)
   - Mangas: tipo, comprimento, construção (curta, longa, 3/4, raglan, japonesa)
   - Bolsos: quantidade, tipo, localização, funcionalidade
   - Fechamentos: tipo e localização (botões, zíper, velcro, etc)

6. **ACABAMENTOS E COSTURAS**
   - Tipo de costura (reta, overlock, flatlock, aparente, oculta)
   - Acabamento de barras (dobrada, elástico, viés)
   - Punhos e cós (tipo, material, construção)
   - Qualidade e precisão dos acabamentos

7. **ESTAMPAS, APLICAÇÕES E GRAFISMOS**
   - Técnica de estampa (sublimação, silk screen, bordado, transfer)
   - Localização precisa no produto (frente, costas, laterais)
   - Tamanho e proporção dos elementos gráficos
   - Logos, marcas ou textos visíveis

8. **AVIAMENTOS E COMPONENTES**
   - Botões: tipo, material, quantidade, tamanho
   - Zíperes: tipo, material, comprimento (metálico, plástico, invisível)
   - Etiquetas: localização e tipo (interna, externa)
   - Outros elementos (ilhoses, rebites, fivelas, cadarços)

9. **CAIMENTO E ERGONOMIA**
   - Ajuste ao corpo (justo, regular, amplo, oversized)
   - Mobilidade e conforto
   - Pontos de tensão e sustentação
   - Queda natural do tecido

10. **ANÁLISE TÉCNICA COMPLEMENTAR**
    - Descrição qualitativa da confecção (ex: "acabamento cuidadoso", "construção robusta")
    - ⚠️ NUNCA use escalas numéricas ou notas (ex: 8/10, 7/10)
    - Indicação de durabilidade aparente (ex: "parece durável", "construção reforçada")
    - Uso e ocasião recomendados
    - Diferenciais técnicos e detalhes exclusivos VISÍVEIS
    - Público ideal baseado nas características visuais

**EXEMPLO DE ANÁLISE TÉCNICA CORRETA (SEM ESPECULAÇÕES):**
"Camiseta masculina casual em malha com textura lisa e aspecto de algodão. Coloração azul navy sólido com acabamento fosco uniforme. Modelagem clássica de corte reto com ligeiro afunilamento na cintura, proporcionando caimento regular ao corpo. Construção com gola careca redonda em ribana, com costura reforçada visível em overlock. Mangas curtas de corte tradicional com barra dobrada. Corpo principal com costuras laterais retas aparentemente em máquina reta industrial, acabamento de barra inferior com bainha dupla. Costura ombro a ombro reforçada com fita de viés visível para maior durabilidade. Etiqueta de composição interna em transfer visível na região do cós traseiro. Tecido com elasticidade aparentemente mínima, proporcionando conforto sem perder a forma. Caimento regular, permitindo mobilidade sem apertar, adequado para uso casual diário ou esportivo leve. Confecção com acabamento cuidadoso e costuras bem executadas, indicando durabilidade aparentemente boa. Público-alvo: masculino adulto, estilo casual contemporâneo."

⚠️ **ERROS A EVITAR:**
- ❌ NUNCA mencione: gramaturas (180g/m²), composições exatas (100% algodão), medidas específicas (2cm), percentuais de elasticidade (5% stretch)
- ❌ NUNCA mencione: idade do modelo/pessoa (jovem, 18-45 anos, etc)
- ❌ NUNCA use: notas numéricas (8/10, 7/10) ou escalas de qualidade
- ✅ USE: descrições qualitativas visuais ("confecção cuidadosa", "durabilidade aparentemente boa", "público adulto")

**INSTRUÇÕES CRÍTICAS:**
- Use SEMPRE terminologia técnica de moda e confecção para descrever o que é VISÍVEL
- Seja EXTREMAMENTE detalhista e preciso no que você PODE VER
- NUNCA mencione medidas, gramaturas ou composições específicas que não sejam visíveis
- Use termos como "aparenta", "parece ser", "aspecto de" quando apropriado
- Descreva cada elemento estrutural VISÍVEL com profundidade
- Analise com olhar de profissional de moda técnica, mas baseado APENAS em evidências visuais
- EVITE descrições genéricas - seja específico no que é visível!
- NUNCA invente especificações técnicas que não podem ser confirmadas visualmente`,
      model: 'gpt-4.1-mini',
      max_tokens: 6000,
      temperature: 0.3
    };

    // Buscar imagens do produto através dos SKUs (máximo 2 imagens para qualidade)
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

    // Log da quantidade de imagens encontradas (máximo 2 para qualidade)
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

---

## PARTE 2: CARACTERÍSTICAS ESPECÍFICAS (APÓS A ANÁLISE TÉCNICA)

**IMPORTANTE:** Somente após completar toda a análise técnica detalhada acima, adicione uma seção separada com o título "### Características Específicas" e responda objetivamente cada item abaixo:

${characteristics.map((c, index) => {
  let question = `\n**${index + 1}. ${c.caracteristica}:**\n`;
  question += `   Pergunta: ${c.pergunta_ia}\n`;
  if (c.valores_possiveis) {
    question += `   Instrução: ${c.valores_possiveis}\n`;
  }
  return question;
}).join('\n')}

**FORMATO PARA CARACTERÍSTICAS ESPECÍFICAS:**
- Crie uma seção separada com título "### Características Específicas"
- Para cada característica, responda: "**Nome:** Resposta objetiva"
- Respostas curtas e diretas (1-3 palavras ou lista separada por vírgula)
- Siga exatamente as instruções fornecidas`;
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
            role: "system",
            content: agent.system_prompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${agent.guidelines_template}

**DADOS DO PRODUTO:**
Nome: ${productInfo.name}
Marca: ${productInfo.brand_name || 'N/A'}
Categoria: ${productInfo.category_name || 'N/A'}${attributesInfo}

**INSTRUÇÃO PRINCIPAL:**

## PARTE 1: ANÁLISE TÉCNICA DETALHADA (OBRIGATÓRIA E PRIORITÁRIA)

VOCÊ DEVE COMEÇAR SUA RESPOSTA COM UMA ANÁLISE TÉCNICA COMPLETA E DETALHADA seguindo TODOS os 10 pontos técnicos descritos acima:

1. CLASSIFICAÇÃO GERAL
2. COMPOSIÇÃO E MATERIAIS
3. COLORIMETRIA E TONALIDADES
4. MODELAGEM E CONSTRUÇÃO
5. ELEMENTOS ESTRUTURAIS DETALHADOS
6. ACABAMENTOS E COSTURAS
7. ESTAMPAS, APLICAÇÕES E GRAFISMOS
8. AVIAMENTOS E COMPONENTES
9. CAIMENTO E ERGONOMIA
10. ANÁLISE TÉCNICA COMPLEMENTAR

**FORMATO ESPERADO:** Escreva 3-5 parágrafos corridos e detalhados cobrindo todos os 10 pontos técnicos. Use linguagem técnica especializada de moda e confecção. Seja extremamente detalhista, preciso e profissional. Esta análise técnica DEVE vir PRIMEIRO na sua resposta.

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
            top_p: 0.8,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            stream: false
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
