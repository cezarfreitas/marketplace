import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

// Função para calcular o custo da OpenAI baseado no modelo e tokens
function calculateOpenAICost(tokens: number, model: string): number {
  // Preços por 1K tokens (em USD) - atualizados para 2024
  const pricing: { [key: string]: { input: number; output: number } } = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // $0.15/$0.60 per 1M tokens
    'gpt-4o': { input: 0.005, output: 0.015 }, // $5/$15 per 1M tokens
    'gpt-4-turbo': { input: 0.01, output: 0.03 }, // $10/$30 per 1M tokens
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }, // $0.50/$1.50 per 1M tokens
  };

  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
  
  // Assumir 70% input tokens e 30% output tokens (aproximação)
  const inputTokens = Math.floor(tokens * 0.7);
  const outputTokens = Math.floor(tokens * 0.3);
  
  const inputCost = (inputTokens / 1000) * modelPricing.input;
  const outputCost = (outputTokens / 1000) * modelPricing.output;
  
  return inputCost + outputCost;
}

// Função para gerar respostas das características usando agente específico
async function generateCharacteristicsResponses(
  product: any,
  imageAnalysis: any,
  marketplaceDescription: any,
  productId: number,
  openaiApiKey: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    console.log('🤖 Iniciando geração de respostas das características...');
    
    // Buscar características ativas
    const characteristicsQuery = `
      SELECT id, caracteristica, pergunta_ia, valores_possiveis
      FROM caracteristicas 
      WHERE is_active = 1
      ORDER BY caracteristica
    `;
    
    const characteristicsResult = await executeQuery(characteristicsQuery, []);
    const characteristics = characteristicsResult || [];
    
    if (!characteristics || characteristics.length === 0) {
      console.log('⚠️ Nenhuma característica ativa encontrada');
      return { success: true, data: [] };
    }
    
    console.log(`📊 Encontradas ${characteristics.length} características ativas`);
    console.log('📋 Características encontradas:', characteristics.map((c: any) => `${c.id}: ${c.caracteristica}`).join(', '));
    
    // Buscar agente de características
    console.log('🔍 Buscando agente de características...');
    const agentQuery = `
      SELECT id, name, system_prompt, model, max_tokens, temperature
      FROM agents 
      WHERE name = 'Agente Características' AND is_active = 1
      LIMIT 1
    `;
    
    const agentResult = await executeQuery(agentQuery, []);
    const agent = agentResult && agentResult.length > 0 ? agentResult[0] : null;
    
    if (!agent) {
      console.log('❌ Agente de características não encontrado');
      return { success: false, error: 'Agente de características não encontrado' };
    }
    
    console.log(`🤖 Usando agente: ${agent.name} (ID: ${agent.id})`);
    
    // Construir prompt para o agente
    const systemPrompt = agent.system_prompt;

    const userPrompt = `Analise este produto e responda as perguntas das características:

=== INFORMAÇÕES DO PRODUTO ===
Nome: ${product.name}
Ref ID: ${product.ref_id || 'N/A'}
Categoria: ${product.category || 'N/A'}

=== ANÁLISE DE IMAGEM ===
${imageAnalysis ? imageAnalysis.contextualizacao : 'Não disponível'}

=== DESCRIÇÃO GERADA ===
Título: ${marketplaceDescription.title}
Descrição: ${marketplaceDescription.description}

=== PERGUNTAS DAS CARACTERÍSTICAS ===
${characteristics.map((char: any) => 
  `${char.id}. ${char.caracteristica}: ${char.pergunta_ia}
   Valores possíveis: ${char.valores_possiveis || 'N/A'}`
).join('\n\n')}

Responda cada pergunta baseado nas informações fornecidas.`;

    console.log('🌐 Chamando API da OpenAI para características (modo rápido)...');
    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // OTIMIZADO: Usar modelo mais rápido
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800, // OTIMIZADO: Reduzido de 1000 para 800
        temperature: 0.2, // OTIMIZADO: Reduzido de 0.3 para 0.2 para resposta mais rápida
        response_format: { type: 'json_object' },
        stream: false // OTIMIZADO: Garantir que não seja streaming
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
    
    const parsedContent = JSON.parse(content);
    console.log('📋 Conteúdo parseado:', JSON.stringify(parsedContent, null, 2));
    
    const respostas = parsedContent.respostas || [];

    console.log(`📊 Respostas geradas: ${respostas.length}`);
    console.log('📋 Respostas detalhadas:', JSON.stringify(respostas, null, 2));

    // Salvar respostas no banco
    for (const resposta of respostas) {
      console.log(`💾 Salvando resposta para característica ${resposta.caracteristica}:`, resposta.resposta);
      const insertQuery = `
        INSERT INTO respostas_caracteristicas 
        (produto_id, caracteristica, resposta, tokens_usados, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        resposta = VALUES(resposta),
        tokens_usados = VALUES(tokens_usados),
        updated_at = NOW()
      `;
      
      try {
        await executeQuery(insertQuery, [
          productId,
          resposta.caracteristica,
          resposta.resposta,
          responseData.usage?.total_tokens || 0
        ]);
        console.log(`✅ Resposta salva para característica ${resposta.caracteristica}`);
      } catch (insertError) {
        console.error(`❌ Erro ao salvar resposta para característica ${resposta.caracteristica}:`, insertError);
      }
    }

    console.log('✅ Respostas das características salvas no banco');
    
    return {
      success: true,
      data: respostas
    };

  } catch (error: any) {
    console.error('❌ Erro ao gerar respostas das características:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para truncar título mantendo palavras completas
function truncateTitleIntelligently(title: string, maxLength: number = 60): string {
  if (title.length <= maxLength) {
    return title;
  }
  
  // Truncar no último espaço antes do limite
  const truncated = title.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex);
  }
  
  // Se não há espaço, truncar no limite
  return truncated;
}

// Função para verificar se título já existe no banco
async function checkTitleExists(title: string, productId: number): Promise<boolean> {
  try {
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM marketplace 
      WHERE title = ? AND product_id != ?
    `;
    const result = await executeQuery(checkQuery, [title, productId]);
    return (result[0] as any).count > 0;
  } catch (error) {
    console.log('⚠️ Erro ao verificar duplicata de título:', error);
    return false;
  }
}

// Função para gerar título único com regeneração via IA
async function generateUniqueTitleWithAI(
  product: any, 
  imageAnalysis: any, 
  productId: number, 
  skus: any[], 
  specifications: any[], 
  agent: any,
  maxAttempts: number = 2 // OTIMIZADO: Reduzido de 3 para 2 tentativas
): Promise<{ success: boolean; data?: any; error?: string }> {
  let attempts = 0;
  let lastGeneratedTitle = '';
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 Tentativa ${attempts} de ${maxAttempts} para gerar título único (modo rápido)...`);
    
    try {
      // Gerar novo título via IA
      const openaiResponse = await generateMeliDescriptionWithOpenAI(
        product, 
        imageAnalysis, 
        productId, 
        skus, 
        specifications, 
        agent,
        attempts > 1 // Se não é a primeira tentativa, pedir para variar
      );
      
      if (!openaiResponse.success) {
        console.log(`❌ Erro na tentativa ${attempts}:`, openaiResponse.error);
        continue;
      }
      
      const generatedTitle = openaiResponse.data?.title;
      if (!generatedTitle) {
        console.log(`❌ Título não gerado na tentativa ${attempts}`);
        continue;
      }
      
      // Verificar se o título tem no máximo 60 caracteres
      let finalTitle = generatedTitle;
      if (finalTitle.length > 60) {
        finalTitle = truncateTitleIntelligently(finalTitle, 60);
        console.log(`⚠️ Título truncado inteligentemente para ${finalTitle.length} caracteres na tentativa ${attempts}:`, finalTitle);
      }
      
      // OTIMIZADO: Verificar unicidade apenas na primeira tentativa para economizar tempo
      if (attempts === 1) {
        const exists = await checkTitleExists(finalTitle, productId);
        if (!exists) {
          console.log(`✅ Título único encontrado na primeira tentativa:`, finalTitle);
          return {
            success: true,
            data: {
              title: finalTitle,
              description: openaiResponse.data?.description,
              clothing_type: openaiResponse.data?.clothing_type,
              sleeve_type: openaiResponse.data?.sleeve_type,
              gender: openaiResponse.data?.gender,
              color: openaiResponse.data?.color,
              modelo: openaiResponse.data?.modelo,
              tokensUsed: openaiResponse.data?.tokensUsed,
              tokensPrompt: openaiResponse.data?.tokensPrompt,
              tokensCompletion: openaiResponse.data?.tokensCompletion,
              cost: openaiResponse.data?.cost,
              requestId: openaiResponse.data?.requestId,
              responseTime: openaiResponse.data?.responseTime
            }
          };
        }
      } else {
        // Na segunda tentativa, usar diretamente com sufixo único para economizar tempo
        const uniqueSuffix = ` ${Date.now().toString().slice(-4)}`;
        const finalTitleWithSuffix = finalTitle.length + uniqueSuffix.length <= 60 
          ? finalTitle + uniqueSuffix
          : truncateTitleIntelligently(finalTitle, 60 - uniqueSuffix.length) + uniqueSuffix;
        
        console.log(`✅ Título com sufixo único gerado na tentativa ${attempts}:`, finalTitleWithSuffix);
        return {
          success: true,
          data: {
            title: finalTitleWithSuffix,
            description: openaiResponse.data?.description,
            clothing_type: openaiResponse.data?.clothing_type,
            sleeve_type: openaiResponse.data?.sleeve_type,
            gender: openaiResponse.data?.gender,
            color: openaiResponse.data?.color,
            modelo: openaiResponse.data?.modelo,
            tokensUsed: openaiResponse.data?.tokensUsed,
            tokensPrompt: openaiResponse.data?.tokensPrompt,
            tokensCompletion: openaiResponse.data?.tokensCompletion,
            cost: openaiResponse.data?.cost,
            requestId: openaiResponse.data?.requestId,
            responseTime: openaiResponse.data?.responseTime
          }
        };
      }
      
      console.log(`⚠️ Título duplicado na tentativa ${attempts}:`, finalTitle);
      lastGeneratedTitle = finalTitle;
      
    } catch (error) {
      console.log(`❌ Erro na tentativa ${attempts}:`, error);
    }
  }
  
  // Se não conseguir gerar título único, usar o último gerado com sufixo
  console.log(`⚠️ Não foi possível gerar título único após ${maxAttempts} tentativas`);
  const fallbackTitle = lastGeneratedTitle || 'Produto de Vestuário';
  const uniqueSuffix = ` ${Date.now().toString().slice(-4)}`;
  const finalFallback = fallbackTitle.length + uniqueSuffix.length <= 60 
    ? fallbackTitle + uniqueSuffix
    : truncateTitleIntelligently(fallbackTitle, 60 - uniqueSuffix.length) + uniqueSuffix;
  
  console.log(`🔄 Usando título de fallback:`, finalFallback);
  return {
    success: true,
    data: {
      title: finalFallback,
      description: 'Descrição não disponível - erro na geração',
      clothing_type: 'Produto de Vestuário',
      sleeve_type: 'Curta',
      gender: 'Sem gênero',
      color: 'Multicolorido',
      modelo: 'Produto Básico, Produto Casual, Produto Simples, Produto Essencial, Produto Versátil',
      tokensUsed: 0,
      tokensPrompt: 0,
      tokensCompletion: 0,
      cost: 0,
      requestId: '',
      responseTime: 0
    }
  };
}

// Função para gerar título único (versão simplificada para compatibilidade)
async function generateUniqueTitle(baseTitle: string, productId: number, maxAttempts: number = 5): Promise<string> {
  let title = baseTitle;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const exists = await checkTitleExists(title, productId);
    if (!exists) {
      return title;
    }
    
    // Se título existe, adicionar sufixo numérico
    attempts++;
    const suffix = ` ${attempts}`;
    title = baseTitle.length + suffix.length <= 60 
      ? baseTitle + suffix
      : truncateTitleIntelligently(baseTitle, 60 - suffix.length) + suffix;
  }
  
  // Se não conseguir gerar título único, retornar com timestamp
  const timestampSuffix = ` ${Date.now().toString().slice(-4)}`;
  return baseTitle.length + timestampSuffix.length <= 60 
    ? baseTitle + timestampSuffix
    : truncateTitleIntelligently(baseTitle, 60 - timestampSuffix.length) + timestampSuffix;
}

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔄 Iniciando geração de descrição do Marketplace...');
    
    let body;
    try {
      body = await request.json();
      console.log('📝 Body recebido:', body);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao processar dados da requisição'
      }, { status: 400 });
    }
    
    const { productId, forceRegenerate = false } = body;

    if (!productId) {
      console.log('❌ productId não fornecido');
      return NextResponse.json({
        success: false,
        message: 'productId é obrigatório'
      }, { status: 400 });
    }

    // Validar se productId é um número
    const numericProductId = parseInt(productId);
    if (isNaN(numericProductId)) {
      console.log('❌ productId inválido:', productId);
      return NextResponse.json({
        success: false,
        message: 'productId deve ser um número válido'
      }, { status: 400 });
    }

    console.log('🔄 Gerando descrição do Marketplace para produto ID:', productId);

    // 1. Buscar dados completos do produto
    console.log('🔍 Buscando dados completos do produto...');
    let products;
    try {
      const productQuery = `
        SELECT 
          p.*,
          b.name as brand_name,
          c.name as category_name
        FROM products_vtex p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories_vtex c ON p.category_id = c.vtex_id
        WHERE p.id = ?
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

    // 2. Buscar SKUs do produto
    console.log('🔍 Buscando SKUs do produto...');
    let skus = [];
    try {
      const skuQuery = `
        SELECT 
          s.*,
          s.name as sku_name,
          s.manufacturer_code,
          s.measurement_unit,
          s.unit_multiplier,
          s.is_kit,
          s.commercial_condition_id,
          s.reward_value,
          s.estimated_date_arrival
        FROM skus_vtex s
        WHERE s.product_id = ?
        ORDER BY s.id
      `;
      
      skus = await executeQuery(skuQuery, [numericProductId]);
      console.log('📊 SKUs encontrados:', skus?.length || 0);
    } catch (error) {
      console.log('⚠️ Erro ao buscar SKUs:', error);
      skus = [];
    }

    // 3. Buscar especificações do produto (se a tabela existir)
    console.log('🔍 Buscando especificações do produto...');
    let specifications = [];
    try {
      const specQuery = `
        SELECT 
          ps.*,
          ps.field_name,
          ps.field_value_ids,
          ps.field_group_name
        FROM product_specifications ps
        WHERE ps.product_id = ?
        ORDER BY ps.field_group_name, ps.field_name
      `;
      
      specifications = await executeQuery(specQuery, [numericProductId]);
      console.log('📊 Especificações encontradas:', specifications?.length || 0);
    } catch (error) {
      console.log('⚠️ Tabela product_specifications não existe ou erro ao buscar:', (error as any)?.message);
      specifications = [];
    }

    // 4. Buscar análise de imagens mais recente
    let imageAnalysis = null;
    try {
      console.log('🔍 Buscando análise de imagens...');
      const analysisQuery = `
        SELECT 
          ial.*,
          a.name as agent_name
        FROM image_analysis_logs ial
        LEFT JOIN agents a ON ial.agent_id = a.id
        WHERE ial.product_id = ?
        ORDER BY ial.created_at DESC
        LIMIT 1
      `;
      
      const analyses = await executeQuery(analysisQuery, [numericProductId]);
      console.log('📊 Análises encontradas:', analyses?.length || 0);
      
      if (analyses && analyses.length > 0) {
        imageAnalysis = analyses[0];
        console.log('🖼️ Análise de imagem encontrada');
      } else {
        console.log('🖼️ Nenhuma análise de imagem encontrada');
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar análise de imagens:', error);
      // Não falhar a operação por causa da análise de imagens
      imageAnalysis = null;
    }

    // 3. Verificar se já existe descrição (se não for regeneração forçada)
    if (!forceRegenerate) {
      console.log('🔍 Verificando se já existe descrição...');
      try {
        const existingQuery = `SELECT * FROM marketplace WHERE product_id = ?`;
        const existing = await executeQuery(existingQuery, [numericProductId]);
        console.log('📊 Descrições existentes:', existing?.length || 0);
        
        if (existing && existing.length > 0) {
          console.log('✅ Descrição já existe, retornando...');
          return NextResponse.json({
            success: true,
            data: existing[0],
            message: 'Descrição já existe'
          });
        }
      } catch (error) {
        console.log('⚠️ Erro ao verificar descrições existentes:', error);
        // Continuar com a geração mesmo se houver erro na verificação
      }
    }

    // 5. Buscar agente de marketplace
    console.log('🔍 Buscando agente de marketplace...');
    let agent;
    try {
      const agentQuery = `
        SELECT * FROM agents 
        WHERE function_type = 'marketplace_description_generation' 
        AND is_active = TRUE
        LIMIT 1
      `;
      const agents = await executeQuery(agentQuery);
      console.log('📊 Agentes encontrados:', agents?.length || 0);
      
      if (!agents || agents.length === 0) {
        throw new Error('Agente de marketplace não encontrado. Configure o agente na tabela agents.');
      }
      
      agent = agents[0];
      console.log('🤖 Agente encontrado:', agent.name);
    } catch (dbError) {
      console.error('❌ Erro ao buscar agente de marketplace:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao acessar agente de marketplace no banco de dados'
      }, { status: 500 });
    }

    // 6. Gerar título único e descrição em uma única chamada (OTIMIZADO)
    console.log('🤖 Gerando título único e descrição com IA (modo rápido)...');
    const startTime = Date.now();
    const openaiResponse = await generateUniqueTitleWithAI(product, imageAnalysis, numericProductId, skus, specifications, agent);
    const generationTime = Date.now() - startTime;
    console.log(`🤖 Resposta da OpenAI (${generationTime}ms):`, openaiResponse.success ? 'Sucesso' : 'Erro');
    
    if (!openaiResponse.success) {
      console.log('❌ Erro na OpenAI:', openaiResponse.error);
      return NextResponse.json({
        success: false,
        message: openaiResponse.error || 'Erro ao gerar descrição com IA'
      }, { status: 500 });
    }

    const { title: uniqueTitle, description, clothing_type, sleeve_type, gender, color, modelo, tokensUsed } = openaiResponse.data || {};
    console.log('📝 Dados gerados:', { title: uniqueTitle, description: description?.substring(0, 50) + '...' });

    // 5. Salvar no banco de dados
    console.log('💾 Salvando no banco de dados...');
    let saveResult;
    try {
      saveResult = await saveMarketplaceDescription({
        productId: numericProductId,
        title: uniqueTitle,
        description,
        openaiModel: agent.model || 'gpt-4o-mini',
        tokensUsed: openaiResponse.data?.tokensUsed || 0,
        tokensPrompt: openaiResponse.data?.tokensPrompt || 0,
        tokensCompletion: openaiResponse.data?.tokensCompletion || 0,
        cost: openaiResponse.data?.cost || 0,
        requestId: openaiResponse.data?.requestId || '',
        responseTime: openaiResponse.data?.responseTime || 0,
        maxTokens: parseInt(agent.max_tokens) || 3000,
        temperature: parseFloat(agent.temperature) || 0.7,
        // Novas colunas do marketplace - usando dados do produto + análise de imagem
      });
      
      console.log('💾 Resultado do salvamento:', saveResult.success ? 'Sucesso' : 'Erro');
      
      if (!saveResult.success) {
        console.log('❌ Erro ao salvar:', saveResult.message);
        return NextResponse.json({
          success: false,
          message: 'Erro ao salvar descrição no banco de dados'
        }, { status: 500 });
      }
    } catch (saveError) {
      console.error('❌ Erro ao salvar no banco:', saveError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao salvar descrição no banco de dados'
      }, { status: 500 });
    }

    // 6. Gerar respostas das características usando subagente
    console.log('🤖 Gerando respostas das características...');
    console.log('📦 Produto para características:', product.name);
    console.log('🖼️ Análise de imagem para características:', imageAnalysis ? 'Disponível' : 'Não disponível');
    console.log('📝 Título para características:', uniqueTitle);
    console.log('🔑 Chave OpenAI para características:', process.env.OPENAI_API_KEY ? 'Configurada' : 'NÃO CONFIGURADA');
    
    const characteristicsResponse = await generateCharacteristicsResponses(
      product,
      imageAnalysis,
      { title: uniqueTitle, description },
      numericProductId,
      process.env.OPENAI_API_KEY || ''
    );

    if (characteristicsResponse.success) {
      console.log(`✅ Respostas das características geradas: ${characteristicsResponse.data?.length || 0}`);
    } else {
      console.log('⚠️ Erro ao gerar respostas das características:', characteristicsResponse.error);
    }

    console.log('✅ Descrição do Marketplace gerada com sucesso!');
    return NextResponse.json({
      success: true,
      data: {
        ...saveResult.data,
        title: uniqueTitle,
        description,
        clothing_type,
        sleeve_type,
        gender,
        color,
        modelo,
        tokensUsed,
        characteristicsResponses: characteristicsResponse.data || []
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar descrição do Marketplace:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao gerar descrição',
      error: error.message
    }, { status: 500 });
  }
}

async function generateMeliDescriptionWithOpenAI(
  product: any, 
  imageAnalysis: any, 
  productId: number, 
  skus: any[] = [], 
  specifications: any[] = [], 
  agent: any,
  shouldVary: boolean = false,
  predefinedTitle?: string
) {
  try {
    console.log('🤖 Iniciando geração com OpenAI...');
    console.log('📦 Produto:', product.name);
    console.log('🖼️ Análise de imagem:', imageAnalysis ? 'Disponível' : 'Não disponível');
    
    // Agente já foi buscado na função principal
    console.log('🤖 Usando agente:', agent.name);

    // Buscar chave da OpenAI das variáveis de ambiente
    console.log('🔍 Buscando chave da OpenAI...');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 Chave da API OpenAI:', openaiApiKey ? 'Configurada' : 'NÃO CONFIGURADA');
    
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      console.log('⚠️ Chave da OpenAI não configurada no .env');
      throw new Error('Chave da API OpenAI não configurada. Configure OPENAI_API_KEY no arquivo .env.');
    }

    console.log('✅ Chave da OpenAI encontrada, continuando...');
    
    // OTIMIZADO: Usar modelo mais rápido para geração de descrições
    const modelToUse = agent.model === 'gpt-4o' ? 'gpt-4o-mini' : (agent.model || 'gpt-4o-mini');
    console.log(`🚀 Usando modelo otimizado: ${modelToUse} (modo rápido)`);

    // Construir prompt para o Marketplace usando configurações do agente
    let systemPrompt = agent.system_prompt || `Você é um especialista em e-commerce e marketing digital, focado especificamente no Marketplace. Sua tarefa é criar títulos e descrições otimizadas para produtos de moda e vestuário que maximizem a visibilidade e conversão no Marketplace.

REGRAS IMPORTANTES:
1. Título deve ter MÁXIMO 60 caracteres (limite obrigatório do Marketplace)
2. Descrição deve ter MÍNIMO 300 palavras, estruturada e eficiente
3. Use palavras-chave relevantes para SEO
4. Inclua informações técnicas e de qualidade
5. Seja persuasivo mas honesto
6. Foque nos benefícios para o cliente
7. Use linguagem clara e direta
8. Estruture a descrição com seções organizadas
9. USE TAGS HTML BÁSICAS para formatação: <br> para quebras de linha, <b> para negrito, <li> para listas
10. OBRIGATÓRIO: A descrição deve ter pelo menos 300 palavras para garantir qualidade e SEO
11. NUNCA AFIRME materiais específicos (como "100% algodão", "poliéster", etc.) sem ter certeza absoluta
12. Use termos genéricos como "material de qualidade", "tecido selecionado", "composição premium" quando não souber o material exato`;

    // Adicionar instruções de unicidade se necessário
    if (shouldVary) {
      systemPrompt += `

INSTRUÇÕES DE UNICIDADE E CRIATIVIDADE:
- CRÍTICO: O título deve ser ÚNICO e não duplicar títulos existentes no banco de dados
- Se esta for uma tentativa de regeneração, CRIE um título COMPLETAMENTE DIFERENTE E MAIS CRIATIVO
- Use sinônimos, variações de palavras e estruturas diferentes
- SEMPRE use palavras de ALTO IMPACTO e BENEFÍCIOS únicos
- Inclua EMOÇÕES e SENTIMENTOS que geram mais cliques
- Use TENDÊNCIAS DE MODA e PALAVRAS DE AÇÃO
- Mantenha as informações essenciais (categoria, marca, gênero, cor) mas varie a apresentação
- Exemplos de variação criativa:
  * Em vez de "Camiseta Nike Masculino Azul" → "Descubra a Camiseta Nike Azul - Estilo que Faz Sucesso"
  * Em vez de "Moletom Adidas Unissex Preto" → "Moletom Adidas Preto Premium - Conforto Garantido"
  * Em vez de "Blusa Zara Feminino Rosa" → "Blusa Rosa Zara - Look Feminino que Conquista"`;
    }

    // Se há um título pré-definido, usar ele
    if (predefinedTitle) {
      systemPrompt += `

TÍTULO PRÉ-DEFINIDO:
- Use EXATAMENTE este título: "${predefinedTitle}"
- NÃO gere um novo título, use o fornecido
- Foque apenas na geração da descrição usando este título`;
    }

    systemPrompt += `

CRIATIVIDADE E OTIMIZAÇÃO DE TÍTULOS:
- Crie títulos ÚNICOS e ATRATIVOS que se destaquem da concorrência
- Use palavras-chave de ALTO IMPACTO que geram mais cliques
- Evite títulos genéricos como "Camiseta Básica" ou "Produto de Qualidade"
- Inclua BENEFÍCIOS e CARACTERÍSTICAS únicas do produto
- Use ADJETIVOS PODEROSOS: "Premium", "Exclusivo", "Tendência", "Moderno", "Estiloso"
- Inclua PALAVRAS DE AÇÃO: "Descubra", "Experimente", "Conquiste", "Transforme"
- Mencione OCASIÕES DE USO: "Para o Dia a Dia", "Ideal para Trabalho", "Perfeito para Festas"
- Use TENDÊNCIAS DE MODA: "Estilo Urbano", "Look Casual", "Visual Moderno", "Fashion"
- Inclua SENTIMENTOS: "Confortável", "Elegante", "Descolado", "Sofisticado"
- Evite repetir o nome da marca no início (coloque no final se necessário)
- Use EMOÇÕES: "Que Vai Te Surpreender", "Que Você Vai Amar", "Que Faz Sucesso"

EXEMPLOS DE TÍTULOS CRIATIVOS:
❌ Ruim: "Camiseta Stance Verde Militar"
✅ Bom: "Camiseta Stance Verde Militar - Estilo Urbano"
✅ Melhor: "Descubra a Camiseta Stance Verde Militar - Look Moderno"
✅ Excelente: "Camiseta Stance Verde Militar - Estilo Urbano que Faz Sucesso"

❌ Ruim: "Moletom Básico Cinza"
✅ Bom: "Moletom Premium Cinza - Conforto Garantido"
✅ Melhor: "Moletom Cinza Premium - Ideal para o Dia a Dia"
✅ Excelente: "Moletom Cinza Premium - Conforto que Você Vai Amar"

ESTRUTURA DA DESCRIÇÃO (MÍNIMO 300 PALAVRAS):
- Parágrafo introdutório sobre o produto (40-60 palavras)
- Informações sobre qualidade e benefícios (40-50 palavras)
- Detalhes técnicos e materiais (50-70 palavras)
- Seção "Destaques do produto" com 4-5 bullet points (50-70 palavras)
- Seção "Material e cuidados" (30-40 palavras)
- Seção "Por que escolher" com 3-4 vantagens (40-50 palavras)
- Seção "FAQ - Perguntas frequentes" com 4-5 perguntas (60-80 palavras)
- Call-to-action final (15-25 palavras)

FORMATO DE RESPOSTA (JSON):
{
  "title": "título criativo e otimizado para busca (máximo 60 caracteres)",
  "description": "descrição completa estruturada",
  "clothing_type": "Tipo de roupa (ex: Camiseta, Camiseta Polo, Moletom, etc.)",
  "sleeve_type": "Tipo de manga (Curta, Longa, 3/4, Sem Mangas, Tomara que caia)",
  "gender": "Gênero (Masculino, Feminino, Meninos, Meninas, Bebês, Sem gênero, Sem gênero infantil)",
  "color": "Cor principal do produto (ex: Azul, Vermelho, Preto, Branco, etc.)",
  "modelo": "5 variações do nome do produto separadas por vírgula (ex: Camiseta Básica, Camiseta Casual, Camisa Dia a Dia, Camisa Lisa, Camisa para Trabalhar)",
}`;

    const userPrompt = `Crie uma descrição otimizada para o Marketplace para este produto:

=== DADOS BÁSICOS DO PRODUTO ===
PRODUTO ORIGINAL: ${product.name}
REF_ID: ${product.ref_id || 'N/A'}
MARCA: ${product.brand_name || 'N/A'}
CATEGORIA: ${product.category_name || 'N/A'}
DEPARTAMENTO ID: ${product.department_id || 'N/A'}
DESCRIÇÃO ATUAL: ${product.description || 'N/A'}
DESCRIÇÃO CURTA: ${product.description_short || 'N/A'}
TÍTULO ATUAL: ${product.title || 'N/A'}
PALAVRAS-CHAVE: ${product.keywords || 'N/A'}
META TAG DESCRIPTION: ${product.meta_tag_description || 'N/A'}
CÓDIGO DE IMPOSTO: ${product.tax_code || 'N/A'}
CÓDIGO SUPPLIER: ${product.supplier_id || 'N/A'}
SCORE: ${product.score || 'N/A'}
DATA DE LANÇAMENTO: ${product.release_date || 'N/A'}
UNIDADE DE MEDIDA: ${product.measurement_unit || 'N/A'}
MULTIPLICADOR: ${product.unit_multiplier || 'N/A'}

=== DADOS DOS SKUs ===
${skus.length > 0 ? skus.map((sku, index) => `
SKU ${index + 1}:
- Nome: ${sku.sku_name || 'N/A'}
- Código Fabricante: ${sku.manufacturer_code || 'N/A'}
- É Kit: ${sku.is_kit ? 'Sim' : 'Não'}
- Unidade: ${sku.measurement_unit || 'N/A'}
- Multiplicador: ${sku.unit_multiplier || 'N/A'}
- Valor Recompensa: ${sku.reward_value || 'N/A'}
- Data Chegada: ${sku.estimated_date_arrival || 'N/A'}
`).join('') : 'Nenhum SKU encontrado'}

=== ESPECIFICAÇÕES TÉCNICAS ===
${specifications.length > 0 ? specifications.map((spec, index) => `
${index + 1}. ${spec.field_name}: ${spec.field_value_ids || 'N/A'} ${spec.field_group_name ? `(Grupo: ${spec.field_group_name})` : ''}
`).join('') : 'Nenhuma especificação encontrada'}

=== ANÁLISE TÉCNICA DAS IMAGENS ===
${imageAnalysis ? `
${imageAnalysis.contextual_analysis}
` : 'Nenhuma análise de imagem disponível'}

INSTRUÇÕES CRÍTICAS: 
- Crie um NOVO TÍTULO otimizado (não use o nome original do produto)
- OBRIGATÓRIO: O título DEVE sempre incluir: CATEGORIA + MARCA + GÊNERO + COR
- OBRIGATÓRIO: O título DEVE sempre incluir o gênero: "Masculino", "Feminino" ou "Unissex"
- OBRIGATÓRIO: O título DEVE sempre incluir a marca do produto
- OBRIGATÓRIO: O título DEVE sempre incluir a categoria do produto
- OBRIGATÓRIO: O título DEVE sempre incluir a cor detectada
- Na descrição, use EXCLUSIVAMENTE o NOVO TÍTULO que você criou, NUNCA o nome original
- O novo título deve ser mais atrativo e otimizado para SEO
- TODA a descrição deve referenciar o produto pelo novo título otimizado

USO DOS DADOS TÉCNICOS:
- Use as ESPECIFICAÇÕES TÉCNICAS para criar seções detalhadas sobre materiais, composição e características
- Use os dados dos SKUs para mencionar variações, códigos de fabricante e informações de disponibilidade
- Use as PALAVRAS-CHAVE do produto para otimizar SEO na descrição
- Use a META TAG DESCRIPTION como referência para criar conteúdo otimizado
- Use o SCORE do produto para destacar qualidade e popularidade
- Use a DATA DE LANÇAMENTO para mencionar se é um produto novo ou lançamento recente
- Use as informações de UNIDADE DE MEDIDA e MULTIPLICADOR para detalhes técnicos
- Use o CÓDIGO DE IMPOSTO e SUPPLIER para informações de conformidade e origem

ESTRUTURA OBRIGATÓRIA DA DESCRIÇÃO:
1. Parágrafo introdutório sobre o produto (use o novo título)
2. Informações sobre a marca e qualidade
3. Detalhes técnicos e materiais
4. Benefícios e características
5. Seção "Destaques do produto" com bullet points
6. Seção "Material e cuidados"
7. Seção "Por que escolher" com vantagens
8. Seção "FAQ - Perguntas frequentes" com 4-5 perguntas
9. Call-to-action final

EXEMPLOS DE COMO MELHORAR O CONTEÚDO (APENAS SUGESTÕES):

Exemplo 1 - Títulos com gênero obrigatório:
- Para produtos masculinos: "[Nome do Produto] Masculino - [Características]"
- Para produtos femininos: "[Nome do Produto] Feminino - [Características]"  
- Para produtos unissex: "[Nome do Produto] Unissex - [Características]"

Exemplo 2 - Introdução mais envolvente:
"Descubra o <b>[Novo Título]</b>, uma peça essencial para quem busca [benefício principal]. Imagine-se [situação de uso específica] com total conforto e estilo. Este produto foi pensado para [público-alvo] que valoriza [características importantes]."

Exemplo 2 - Storytelling da marca:
"A <b>[Marca]</b> nasceu da paixão por [história da marca]. Cada produto carrega nossa missão de [valores da marca]. Quando você escolhe [Marca], está escolhendo [benefício da escolha da marca]."

Exemplo 3 - Destaques mais persuasivos:
"<b>O que torna este produto especial:</b><br>
<li><b>Design inteligente:</b> [explicação detalhada do design]</li>
<li><b>Conforto garantido:</b> [explicação do conforto]</li>
<li><b>Durabilidade excepcional:</b> [explicação da durabilidade]</li>
<li><b>Versatilidade única:</b> [explicação da versatilidade]</li>"

Exemplo 3b - Como falar sobre materiais sem afirmar:
"<b>Qualidade e conforto:</b><br>
<li><b>Material selecionado:</b> Tecido de alta qualidade que oferece [benefícios]</li>
<li><b>Composição premium:</b> Material cuidadosamente escolhido para [propósito]</li>
<li><b>Acabamento refinado:</b> Detalhes que garantem [benefícios específicos]</li>"

Exemplo 4 - FAQ mais humanizado:
"<b>Dúvidas frequentes:</b><br>
<b>Este produto é adequado para [situação específica]?</b><br>
Sim! O [Novo Título] foi desenvolvido pensando em [situação específica]. [Explicação detalhada com benefícios].<br><br>

<b>Como posso ter certeza da qualidade?</b><br>
Nossa garantia de [tempo] cobre [cobertura da garantia]. Além disso, [argumentos de qualidade adicionais]."

Exemplo 5 - Call-to-action mais persuasivo:
"Não perca a oportunidade de ter o <b>[Novo Título]</b> em seu guarda-roupa. [Benefício imediato da compra]. [Urgência ou escassez]. Garanta o seu agora e [benefício adicional da compra]!"

INSTRUÇÕES DE FORMATAÇÃO HTML:
- Use <br> para quebras de linha (não use \n)
- Use <b>texto</b> para destacar palavras importantes
- Use <li>item</li> para criar listas (não use • ou -)
- Use <br><br> para separar parágrafos
- Mantenha o HTML simples e limpo

DETECÇÃO DE TIPO DE ROUPA:
- Analise o nome do produto para identificar o tipo de roupa
- Se contém "Polo" ou "polo" → "Camiseta Polo"
- Se contém "Camiseta" mas não "Polo" → "Camiseta"
- Se contém "Moletom" → "Moletom"
- Se contém "Calça" → "Calça"
- Se contém "Short" → "Short"
- Se contém "Jaqueta" → "Jaqueta"
- Se contém "Blusa" → "Blusa"
- Se contém "Vestido" → "Vestido"
- Se contém "Saia" → "Saia"
- Se não identificar, use o tipo mais genérico baseado no contexto

DETECÇÃO DE TIPO DE MANGA:
- Analise o nome do produto e descrição para identificar o tipo de manga
- Se contém "Manga Curta", "Curta", "Regata" → "Curta"
- Se contém "Manga Longa", "Longa", "Comprida" → "Longa"
- Se contém "3/4", "Três Quartos", "Meia Manga" → "3/4"
- Se contém "Sem Manga", "Sem Mangas", "Regata", "Tank Top" → "Sem Mangas"
- Se contém "Tomara que Caia", "Tomara que caia", "Off Shoulder" → "Tomara que caia"
- Se não identificar, use "Curta" como padrão para camisetas e "Longa" para blusas/jaquetas

DETECÇÃO DE GÊNERO:
- Analise o nome do produto e descrição para identificar o gênero
- Se contém "Masculina", "Masculino", "Homem", "Men" → "Masculino"
- Se contém "Feminina", "Feminino", "Mulher", "Woman", "Lady" → "Feminino"
- Se contém "Meninos", "Boy", "Boys" → "Meninos"
- Se contém "Meninas", "Girl", "Girls" → "Meninas"
- Se contém "Bebê", "Bebês", "Baby", "Infantil" (para bebês) → "Bebês"
- Se contém "Unissex", "Uni", "Neutro" → "Sem gênero"
- Se contém "Infantil" (para crianças) → "Sem gênero infantil"
- Se não identificar, use "Sem gênero" como padrão

DETECÇÃO DE COR:
- Analise o nome do produto e descrição para identificar a cor principal
- Procure por palavras como: Azul, Vermelho, Preto, Branco, Verde, Amarelo, Rosa, Roxo, Cinza, Marrom, Bege, etc.
- Se houver múltiplas cores, escolha a cor predominante
- Se não identificar cor específica, use "Multicolorido" ou a cor mais comum mencionada
- CRÍTICO: A cor detectada DEVE aparecer no título do produto
- A cor deve ser uma palavra simples e clara (ex: "Azul", "Preto", "Rosa")

ESTRUTURA OBRIGATÓRIA DO TÍTULO:
- O título DEVE incluir: CATEGORIA + MARCA + GÊNERO + COR
- LIMITE CRÍTICO: MÁXIMO 60 caracteres
- Formato: "[Nome do Produto] [Marca] [Gênero] [Cor] - [Características]"
- Exemplos:
  * "Camiseta Nike Masculino Azul - Conforto" (42 caracteres)
  * "Blusa Zara Feminino Rosa - Elegante" (35 caracteres)
  * "Moletom Adidas Unissex Preto - Casual" (37 caracteres)
- OBRIGATÓRIO: Sempre incluir a marca do produto no título
- OBRIGATÓRIO: Sempre incluir a categoria do produto no título
- OBRIGATÓRIO: Sempre incluir o gênero detectado: "Masculino", "Feminino" ou "Unissex"
- OBRIGATÓRIO: Sempre incluir a cor detectada no título
- OBRIGATÓRIO: Título deve ser ÚNICO e não duplicar títulos existentes
- O gênero no título deve corresponder exatamente ao campo "gender" detectado
- Se o gênero for "Masculino" → título deve conter "Masculino"
- Se o gênero for "Feminino" → título deve conter "Feminino"
- Se o gênero for "Sem gênero" → título deve conter "Unissex"

GERAÇÃO DE VARIAÇÕES DO NOME (CAMPO MODELO):
- Crie EXATAMENTE 5 variações do nome do produto separadas por vírgula
- Estas variações NÃO devem aparecer no título ou na descrição
- Use diferentes formas de chamar o mesmo produto
- Inclua variações que os clientes usariam para buscar o produto
- Exemplos de variações:
  * Para "Camiseta Básica": "Camiseta Casual, Camisa Dia a Dia, Camisa Lisa, Camisa para Trabalhar, Camiseta Simples"
  * Para "Blusa Elegante": "Blusa Social, Blusa para Festa, Blusa Feminina, Blusa Chique, Blusa Sofisticada"
  * Para "Moletom Confortável": "Moletom Casual, Moletom para Casa, Moletom Quentinho, Moletom Relax, Moletom Básico"
- Formato: "Variação 1, Variação 2, Variação 3, Variação 4, Variação 5"
- Exemplo: "Camiseta Básica, Camiseta Casual, Camisa Dia a Dia, Camisa Lisa, Camisa para Trabalhar"


CRIATIVIDADE E FLEXIBILIDADE:
- Use os exemplos acima como inspiração, não como regras rígidas
- Seja criativo na estrutura e abordagem
- Adapte o tom e estilo ao produto específico
- Varie a linguagem para evitar repetição
- Crie conexão emocional com o cliente
- Use storytelling quando apropriado
- Seja autêntico e persuasivo

CUIDADOS COM INFORMAÇÕES TÉCNICAS:
- Use termos genéricos: "material de qualidade", "tecido selecionado", "composição premium"
- Foque nos BENEFÍCIOS do material, não na composição exata
- Se mencionar cuidados, seja genérico: "siga as instruções de lavagem do fabricante"

LEMBRE-SE: A descrição deve usar APENAS o novo título otimizado, NUNCA o nome original do produto.

Retorne APENAS o JSON com as informações solicitadas.`;

    console.log('🌐 Chamando API da OpenAI (modo rápido)...');
    const startTime = Date.now();
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse, // OTIMIZADO: Usar modelo mais rápido
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: Math.min(parseInt(agent.max_tokens) || 2000, 2000), // OTIMIZADO: Limitar a 2000 tokens
          temperature: Math.min(parseFloat(agent.temperature) || 0.5, 0.5), // OTIMIZADO: Reduzir temperatura para resposta mais rápida
          response_format: { type: 'json_object' },
          stream: false // OTIMIZADO: Garantir que não seja streaming
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Erro na API OpenAI:', response.status, errorData);
        throw new Error(`Erro na API OpenAI: ${response.status} - ${errorData}`);
      }
    } catch (fetchError) {
      console.error('❌ Erro na requisição para OpenAI:', fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido';
      throw new Error(`Erro na requisição para OpenAI: ${errorMessage}`);
    }

    const responseTime = Date.now() - startTime;
    let data;
    try {
      data = await response.json();
      console.log('✅ Resposta da OpenAI recebida');
      console.log('⏱️ Tempo de resposta:', responseTime, 'ms');
      console.log('🔢 Tokens utilizados:', data.usage?.total_tokens || 0);
    } catch (jsonError) {
      console.error('❌ Erro ao fazer parse da resposta JSON:', jsonError);
      throw new Error('Resposta inválida da OpenAI');
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Estrutura de resposta inválida:', data);
      throw new Error('Resposta inválida da OpenAI');
    }

    const content = data.choices[0].message.content;
    console.log('📝 Conteúdo recebido:', content?.substring(0, 100) + '...');

    if (!content) {
      console.error('❌ Conteúdo vazio na resposta da OpenAI');
      throw new Error('Resposta vazia da OpenAI');
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
      console.log('📋 Conteúdo parseado:', JSON.stringify(parsedContent, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('❌ Conteúdo que causou erro:', content);
      throw new Error('Resposta da OpenAI não é um JSON válido');
    }

    // Debug: verificar campos disponíveis
    console.log('🔍 Campos disponíveis na resposta:', Object.keys(parsedContent));
    console.log('🔍 Título recebido:', parsedContent.title);
    console.log('🔍 Descrição recebida:', parsedContent.description ? 'Disponível' : 'N/A');

    // Se há um título pré-definido, usar ele
    let finalTitle;
    if (predefinedTitle) {
      finalTitle = predefinedTitle;
      console.log('🔍 Usando título pré-definido:', finalTitle);
    } else {
      // Garantir que o título tenha no máximo 60 caracteres
      finalTitle = parsedContent.title || parsedContent.titulo || 'Título não gerado';
      if (finalTitle.length > 60) {
        finalTitle = truncateTitleIntelligently(finalTitle, 60);
        console.log(`⚠️ Título truncado inteligentemente para ${finalTitle.length} caracteres:`, finalTitle);
      }
    }

    // Se não há título pré-definido, gerar título único
    let uniqueTitle = finalTitle;
    if (!predefinedTitle) {
      try {
        uniqueTitle = await generateUniqueTitle(finalTitle, productId);
        console.log('🔍 Título único gerado:', uniqueTitle);
      } catch (titleError) {
        console.error('❌ Erro ao gerar título único:', titleError);
        // Usar título original se houver erro na verificação de duplicatas
        uniqueTitle = finalTitle;
      }
    }

    return {
      success: true,
      data: {
        title: uniqueTitle,
        description: parsedContent.description || parsedContent.descricao || 'Descrição não gerada',
        clothing_type: parsedContent.clothing_type || 'Produto de Vestuário',
        sleeve_type: parsedContent.sleeve_type || 'Curta',
        gender: parsedContent.gender || 'Sem gênero',
        color: parsedContent.color || 'Multicolorido',
        modelo: parsedContent.modelo || 'Produto Básico, Produto Casual, Produto Simples, Produto Essencial, Produto Versátil',
        tokensUsed: data.usage?.total_tokens || 0,
        tokensPrompt: data.usage?.prompt_tokens || 0,
        tokensCompletion: data.usage?.completion_tokens || 0,
        cost: calculateOpenAICost(data.usage?.total_tokens || 0, agent.model || 'gpt-4o-mini'),
        requestId: data.id || '',
        responseTime: responseTime
      }
    };

  } catch (error: any) {
    console.error('❌ Erro na geração com OpenAI:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para salvar descrição do Marketplace na nova tabela marketplace
async function saveMarketplaceDescription(data: {
  productId: number;
  title: string;
  description: string;
  openaiModel: string;
  tokensUsed: number;
  tokensPrompt: number;
  tokensCompletion: number;
  cost: number;
  requestId: string;
  responseTime: number;
  maxTokens?: number;
  temperature?: number;
  // Novas colunas do marketplace
}) {
  try {
    const { 
      productId, 
      title, 
      description, 
      openaiModel,
      tokensUsed,
      tokensPrompt,
      tokensCompletion,
      cost,
      requestId,
      responseTime,
      maxTokens,
      temperature,
    } = data;

    // Inserir ou atualizar descrição na tabela marketplace
    const insertQuery = `
      INSERT INTO marketplace (
        product_id, title, description, openai_model, openai_tokens_used, 
        openai_tokens_prompt, openai_tokens_completion, openai_cost, 
        openai_request_id, openai_response_time_ms, openai_max_tokens, 
        openai_temperature, status, generated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', NOW())
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        openai_model = VALUES(openai_model),
        openai_tokens_used = VALUES(openai_tokens_used),
        openai_tokens_prompt = VALUES(openai_tokens_prompt),
        openai_tokens_completion = VALUES(openai_tokens_completion),
        openai_cost = VALUES(openai_cost),
        openai_request_id = VALUES(openai_request_id),
        openai_response_time_ms = VALUES(openai_response_time_ms),
        openai_max_tokens = VALUES(openai_max_tokens),
        openai_temperature = VALUES(openai_temperature),
        status = 'generated',
        generated_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
    `;

    const result = await executeQuery(insertQuery, [
      productId,
      title,
      description,
      openaiModel,
      tokensUsed,
      tokensPrompt,
      tokensCompletion,
      cost,
      requestId,
      responseTime,
      maxTokens || 0,
      temperature || 0.7
    ]);

    console.log('✅ Descrição do Marketplace salva na tabela marketplace para produto ID:', productId);

    return {
      success: true,
      data: {
        id: (result as any).insertId,
        productId,
        title,
        description
      }
    };

  } catch (error: any) {
    console.error('❌ Erro ao salvar descrição do Marketplace:', error);
    
    return {
      success: false,
      message: 'Erro interno do servidor ao salvar descrição',
      error: error.message
    };
  }
}