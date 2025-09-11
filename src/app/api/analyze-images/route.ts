import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';
import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente do arquivo .env
config({ path: resolve(process.cwd(), '.env') });

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🧪 API de análise iniciada');
    
    const { productId, timestamp, forceNewAnalysis, categoryVtexId } = await request.json();
    console.log('📦 ProductId recebido:', productId);

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

    console.log(`🖼️ Iniciando análise de imagens para produto ID: ${productId}`);

    // Buscar o agente de análise de imagem
    const agents = await executeQuery(`
      SELECT id, name, system_prompt, guidelines_template, model, max_tokens, temperature, 
             function_type, is_active, created_at, updated_at
      FROM agents 
      WHERE function_type = 'image_analysis' AND is_active = TRUE
      LIMIT 1
    `);

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Agente de análise de imagem não encontrado'
      }, { status: 404 });
    }

    const agent = agents[0];
    console.log(`✅ Agente encontrado: ${agent.name}`);

    // Buscar imagens do produto através dos SKUs (limitado a 3 imagens)
    const images = await executeQuery(`
      SELECT i.id, i.file_location, i.text as alt_text, i.is_main as is_primary, i.sku_id, i.name, i.label
      FROM images_vtex i
      INNER JOIN skus_vtex s ON i.sku_id = s.id
      WHERE s.product_id = ?
      ORDER BY i.is_main DESC, i.position ASC, i.id ASC
      LIMIT 3
    `, [productId]);

    if (!images || images.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma imagem encontrada para este produto'
      }, { status: 404 });
    }

    console.log(`📸 Encontradas ${images.length} imagens para análise (limitado a 3 imagens)`);

    // Processar URLs das imagens (sem validação)
    const validImages = images.map(img => ({
      ...img,
      url: `https://projetoinfluencer.${img.file_location}`,
      valid: true
    }));

    console.log(`📸 Processadas ${validImages.length} imagens para análise`);

    // Função para analisar imagens com OpenAI
    const analyzeImagesWithOpenAI = async (images: any[], productInfo: any, characteristics: any[], attributes: any[]) => {
      try {
        // Buscar chave da OpenAI das variáveis de ambiente
        const openaiApiKey = process.env.OPENAI_API_KEY;
        
        if (!openaiApiKey || openaiApiKey.trim() === '') {
          console.log('⚠️ Chave da OpenAI não configurada no .env');
          return null;
        }
        
        console.log('🔑 Chave da OpenAI encontrada, enviando para análise...');
        console.log('🔑 Chave API (primeiros 10 chars):', openaiApiKey.substring(0, 10) + '...');
        console.log('🔑 Tamanho da chave:', openaiApiKey.length);
        
        // Preparar perguntas das características ativas
        let characteristicsQuestions = '';
        if (characteristics && characteristics.length > 0) {
          characteristicsQuestions = `

**PERGUNTAS ADICIONAIS PARA ANÁLISE:**
${characteristics.map((c, index) => {
  let question = `${index + 1}. ${c.caracteristica}: ${c.pergunta_ia}`;
  if (c.valores_possiveis) {
    question += `\n   Valores possíveis: ${c.valores_possiveis}`;
  }
  return question;
}).join('\n')}

**INSTRUÇÕES IMPORTANTES:**
- Responda essas perguntas no final da sua análise, após a contextualização principal
- Se você NÃO conseguir identificar ou determinar uma característica específica com certeza, NÃO inclua essa característica na resposta
- Apenas inclua características que você pode identificar claramente nas imagens ou dados do produto
- Não use "N/A", "Não identificado" ou respostas genéricas - simplesmente omita a característica`;
        }

        // Preparar lista de atributos do produto
        let attributesInfo = '';
        if (attributes && attributes.length > 0) {
          attributesInfo = `

**ATRIBUTOS TÉCNICOS DO PRODUTO:**
${attributes.map(attr => {
  const values = typeof attr.attribute_values === 'string' 
    ? JSON.parse(attr.attribute_values) 
    : attr.attribute_values;
  const valuesList = Array.isArray(values) ? values.join(', ') : values;
  return `• ${attr.attribute_name}: ${valuesList}`;
}).join('\n')}

Use essas informações técnicas para complementar sua análise visual e dar respostas mais precisas sobre as características do produto.`;
        }

        // Preparar mensagens para a API da OpenAI (otimizado para velocidade)
        const messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${agent.guidelines_template || 'Analise esta peça de vestuário e crie uma descrição técnica concisa.'}

**DADOS COMPLETOS DO PRODUTO:**
Nome do Produto: ${productInfo.name}
Marca: ${productInfo.brand_name || 'N/A'}
Categoria: ${productInfo.category_name || 'N/A'}
Descrição: ${productInfo.description || 'N/A'}
Título: ${productInfo.title || 'N/A'}
Palavras-chave: ${productInfo.keywords || 'N/A'}
REF_ID: ${productInfo.ref_id || 'N/A'}${attributesInfo}

Analise as imagens considerando TODOS estes dados do produto para dar respostas consistentes e que façam sentido.${characteristicsQuestions}`
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
            model: 'gpt-4o', // Modelo mais avançado para análise de imagem
            messages: messages,
            max_tokens: 4000, // Mais tokens para análises detalhadas
            temperature: 0.2, // Temperatura mais baixa para consistência
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
          console.log('✅ Análise da OpenAI concluída');
          
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
          
          const modelUsed = agent.model || 'gpt-4o-mini';
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
        p.id, p.name, p.title, p.description, p.brand_id, p.category_id, p.ref_id, p.keywords,
        b.name as brand_name
      FROM products_vtex p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = ?
    `, [productId]);

    // Buscar atributos do produto
    const productAttributes = await executeQuery(`
      SELECT attribute_name, attribute_values
      FROM product_attributes
      WHERE product_id = ?
      ORDER BY attribute_name
    `, [productId]);

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const product = products[0];
    console.log(`📋 Usando categoryVtexId do payload: ${categoryVtexId}`);
    console.log(`📋 ${productAttributes?.length || 0} atributos encontrados para o produto`);

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

    console.log(`📋 ${characteristics?.length || 0} características ativas encontradas para categoryVtexId: ${categoryVtexId}`);

    // Verificar se existem características configuradas para esta categoria
    if (!characteristics || characteristics.length === 0) {
      console.log('⚠️ Nenhuma característica configurada para esta categoria');
      return NextResponse.json({
        success: false,
        message: `Nenhuma característica está configurada para a categoria "ID: ${categoryVtexId}". Configure as características para esta categoria primeiro.`
      }, { status: 400 });
    }

    // Analisar imagens com OpenAI (obrigatório)
    console.log('🤖 Iniciando análise com OpenAI...');
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
        model: agent.model || 'gpt-4o-mini',
        max_tokens: parseInt(agent.max_tokens) || 800,
        temperature: parseFloat(agent.temperature) || 0.5,
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

    console.log(`✅ Análise concluída para produto ${product.name}`);

    // Salvar dados da análise na tabela de logs (simplificado)
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    try {
      console.log('💾 Tentando salvar logs da análise...');
      await executeQuery(`
        INSERT INTO image_analysis_logs (
          product_id, product_ref_id, agent_id, analysis_type, model_used, tokens_used, max_tokens, temperature,
          analysis_quality, total_images, valid_images, invalid_images, product_type,
          analysis_duration_ms, openai_response_time_ms, success, analysis_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productId,
        product.ref_id || null,
        agent.id,
        'openai',
        'gpt-4o-mini',
        openaiAnalysis.tokens_used,
        parseInt(agent.max_tokens) || 2000,
        parseFloat(agent.temperature) || 0.7,
        analysisQuality.level,
        validImages.length,
        validImages.length,
        0,
        productType,
        totalDuration,
        openaiAnalysis.response_time_ms,
        true,
        finalAnalysis
      ]);
      console.log(`💾 Dados da análise salvos na tabela de logs`);
    } catch (logError) {
      console.error('⚠️ Erro ao salvar logs da análise:', logError);
      // Não falhar a análise por erro de log
    }

    // Salvar contextualização e logs da OpenAI na tabela analise_imagens
    try {
      console.log('💾 Salvando contextualização e logs da OpenAI na tabela analise_imagens...');
      
      // Verificar se já existe uma análise para este produto
      const existingAnalysis = await executeQuery(`
        SELECT id_produto FROM analise_imagens WHERE id_produto = ?
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
          WHERE id_produto = ?
        `, [
          finalAnalysis,
          openaiAnalysis.model_used,
          openaiAnalysis.tokens_used,
          openaiAnalysis.tokens_prompt || Math.floor(openaiAnalysis.tokens_used * 0.7),
          openaiAnalysis.tokens_completion || Math.floor(openaiAnalysis.tokens_used * 0.3),
          openaiAnalysis.cost || 0,
          openaiAnalysis.request_id || '',
          parseInt(agent.max_tokens) || 800,
          parseFloat(agent.temperature) || 0.5,
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
        console.log(`💾 Análise e logs atualizados para produto ${productId}`);
      } else {
        // Inserir nova análise com todos os dados
        await executeQuery(`
          INSERT INTO analise_imagens (
            id_produto, contextualizacao, openai_model, openai_tokens_used, 
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
          parseInt(agent.max_tokens) || 800,
          parseFloat(agent.temperature) || 0.5,
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
        console.log(`💾 Nova análise e logs salvos para produto ${productId}`);
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
