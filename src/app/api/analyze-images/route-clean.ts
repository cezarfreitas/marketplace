import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🧪 API de análise iniciada');
    
    const { productId, timestamp, forceNewAnalysis } = await request.json();
    console.log('📦 ProductId recebido:', productId);

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto é obrigatório'
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

    // Buscar imagens do produto através dos SKUs
    const images = await executeQuery(`
      SELECT i.id, i.file_location, i.text as alt_text, i.is_main as is_primary, i.sku_id, i.name, i.label
      FROM images i
      INNER JOIN skus s ON i.sku_id = s.id
      WHERE s.product_id = ?
      ORDER BY i.is_main DESC, i.position ASC, i.id ASC
    `, [productId]);

    if (!images || images.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma imagem encontrada para este produto'
      }, { status: 404 });
    }

    console.log(`📸 Encontradas ${images.length} imagens para análise`);

    // Processar URLs das imagens (sem validação)
    const validImages = images.map(img => ({
      ...img,
      url: `https://projetoinfluencer.${img.file_location}`,
      valid: true
    }));

    console.log(`📸 Processadas ${validImages.length} imagens para análise`);

    // Função para analisar imagens com OpenAI
    const analyzeImagesWithOpenAI = async (images: any[], productInfo: any) => {
      try {
        // Buscar chave da OpenAI das configurações
        const settings = await executeQuery(`
          SELECT config_value 
          FROM system_config 
          WHERE config_key = 'openai_api_key'
        `);

        if (!settings || settings.length === 0) {
          console.log('⚠️ Chave da OpenAI não configurada');
          return null;
        }

        const openaiApiKey = settings[0].config_value;
        
        if (!openaiApiKey || openaiApiKey.trim() === '') {
          console.log('⚠️ Chave da OpenAI está vazia');
          return null;
        }
        
        console.log('🔑 Chave da OpenAI encontrada, enviando para análise...');
        
        // Preparar mensagens para a API da OpenAI (formato simplificado)
        const messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Detalhe tecnicamente a peça de vestuário desta foto como se fosse uma ficha técnica de moda (caimento, gola, mangas, corpo, estampa, acabamentos). 

PRODUTO: ${productInfo.name}${productInfo.title ? ` - ${productInfo.title}` : ''}
REF_ID: ${productInfo.ref_id || 'N/A'}

Crie uma análise técnica profissional focando nos detalhes visíveis das imagens.`
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

        // Fazer chamada para a API da OpenAI
        const openaiStartTime = Date.now();
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: parseInt(agent.max_tokens) || 2000,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erro na API da OpenAI:', response.status, response.statusText);
          console.error('❌ Detalhes do erro:', errorText);
          return null;
        }

        const result = await response.json();
        const openaiEndTime = Date.now();
        const analysis = result.choices[0]?.message?.content;

        if (analysis) {
          console.log('✅ Análise da OpenAI concluída');
          return {
            openai_analysis: analysis,
            model_used: 'gpt-4o-mini',
            tokens_used: result.usage?.total_tokens || 0,
            response_time_ms: openaiEndTime - openaiStartTime
          };
        }

        return null;
      } catch (error) {
        console.error('❌ Erro ao analisar com OpenAI:', error);
        return null;
      }
    };

    // Buscar informações do produto
    const products = await executeQuery(`
      SELECT id, name, title, description, brand_id, category_id, ref_id
      FROM products 
      WHERE id = ?
    `, [productId]);

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const product = products[0];

    // Analisar imagens com OpenAI (obrigatório)
    console.log('🤖 Iniciando análise com OpenAI...');
    const openaiAnalysis = await analyzeImagesWithOpenAI(validImages, product);

    // Verificar se a análise da OpenAI foi bem-sucedida
    if (!openaiAnalysis) {
      return NextResponse.json({
        success: false,
        message: 'Falha na análise com OpenAI. Verifique a chave da API e tente novamente.'
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

    // Qualidade de análise simples
    const analysisQuality = { level: 'alta', description: 'Análise técnica com GPT-4o' };

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
        model: 'gpt-4o-mini',
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

    return NextResponse.json({
      success: true,
      analysis: detailedAnalysis,
      product: analysisData.product,
      images: analysisData.images,
      invalid_images: [],
      agent_used: analysisData.agent.name,
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
