import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

// API OTIMIZADA para geração RÁPIDA de descrições do marketplace
export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🚀 Iniciando geração RÁPIDA de descrição do Marketplace...');
    
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

    console.log('🚀 Gerando descrição RÁPIDA do Marketplace para produto ID:', productId);

    // 1. Buscar dados básicos do produto (OTIMIZADO: apenas campos essenciais)
    console.log('🔍 Buscando dados básicos do produto...');
    let products;
    try {
      const productQuery = `
        SELECT 
          p.id, p.name, p.ref_id, p.description, p.brand_id, p.category_id,
          b.name as brand_name,
          c.name as category_name
        FROM products_vtex p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories_vtex c ON p.category_id = c.vtex_id
        WHERE p.id = ?
      `;
      products = await executeQuery(productQuery, [numericProductId]);
      
      if (!products || products.length === 0) {
        console.log('❌ Produto não encontrado:', numericProductId);
        return NextResponse.json({
          success: false,
          message: 'Produto não encontrado'
        }, { status: 404 });
      }
      
      console.log('✅ Produto encontrado:', products[0].name);
    } catch (dbError) {
      console.error('❌ Erro ao buscar produto:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar dados do produto'
      }, { status: 500 });
    }

    const product = products[0];

    // 2. Verificar se já existe descrição (se não for regeneração forçada)
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

    // 3. Gerar descrição rápida com IA (OTIMIZADO)
    console.log('🤖 Gerando descrição RÁPIDA com IA...');
    const startTime = Date.now();
    const openaiResponse = await generateFastDescription(product, numericProductId);
    const generationTime = Date.now() - startTime;
    console.log(`🤖 Resposta da OpenAI (${generationTime}ms):`, openaiResponse.success ? 'Sucesso' : 'Erro');
    
    if (!openaiResponse.success) {
      console.log('❌ Erro na OpenAI:', openaiResponse.error);
      return NextResponse.json({
        success: false,
        message: openaiResponse.error || 'Erro ao gerar descrição com IA'
      }, { status: 500 });
    }

    const { title, description, clothing_type, sleeve_type, gender, color, modelo, tokensUsed } = openaiResponse.data || {};
    console.log('📝 Dados gerados:', { title, description: description?.substring(0, 50) + '...' });

    // 4. Salvar no banco de dados
    console.log('💾 Salvando no banco de dados...');
    let saveResult;
    try {
      saveResult = await saveMarketplaceDescription({
        productId: numericProductId,
        title,
        description,
        openaiModel: 'gpt-4o-mini',
        tokensUsed: tokensUsed || 0,
        tokensPrompt: 0,
        tokensCompletion: 0,
        cost: 0,
        requestId: '',
        responseTime: generationTime,
        maxTokens: 2000,
        temperature: 0.5,
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

    console.log('✅ Descrição RÁPIDA do Marketplace gerada com sucesso!');
    return NextResponse.json({
      success: true,
      data: {
        ...saveResult.data,
        title,
        description,
        clothing_type,
        sleeve_type,
        gender,
        color,
        modelo,
        tokensUsed,
        generationTime
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar descrição RÁPIDA do Marketplace:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao gerar descrição',
      error: error.message
    }, { status: 500 });
  }
}

// Função otimizada para geração rápida de descrições
async function generateFastDescription(
  product: any, 
  productId: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🤖 Iniciando geração RÁPIDA com OpenAI...');
    console.log('📦 Produto:', product.name);

    // Buscar chave da OpenAI das variáveis de ambiente
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      throw new Error('Chave da API OpenAI não configurada. Configure OPENAI_API_KEY no arquivo .env.');
    }

    // Prompt otimizado e mais curto para resposta mais rápida
    const systemPrompt = `Você é um especialista em e-commerce. Crie títulos e descrições otimizadas para marketplace de forma RÁPIDA e EFICIENTE.

REGRAS:
- Título: máximo 60 caracteres, incluir marca, categoria, gênero e cor
- Descrição: 200-300 palavras, estruturada e persuasiva
- Use HTML básico: <b>, <br>, <li>
- Seja criativo mas conciso
- Foque em benefícios e características principais

FORMATO JSON:
{
  "title": "título otimizado",
  "description": "descrição estruturada",
  "clothing_type": "tipo de roupa",
  "sleeve_type": "tipo de manga",
  "gender": "gênero",
  "color": "cor principal",
  "modelo": "5 variações separadas por vírgula"
}`;

    const userPrompt = `Crie uma descrição otimizada para marketplace:

PRODUTO: ${product.name}
MARCA: ${product.brand_name || 'N/A'}
CATEGORIA: ${product.category_name || 'N/A'}
REF_ID: ${product.ref_id || 'N/A'}
DESCRIÇÃO ATUAL: ${product.description || 'N/A'}

Gere título e descrição otimizados de forma RÁPIDA e EFICIENTE.`;

    console.log('🌐 Chamando API da OpenAI (modo ULTRA RÁPIDO)...');
    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modelo mais rápido
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500, // Reduzido para resposta mais rápida
        temperature: 0.3, // Baixa temperatura para resposta mais rápida
        response_format: { type: 'json_object' },
        stream: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro na API OpenAI:', response.status, errorData);
      throw new Error(`Erro na API OpenAI: ${response.status} - ${errorData}`);
    }

    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    console.log('✅ Resposta da OpenAI recebida');
    console.log('⏱️ Tempo de resposta:', responseTime, 'ms');
    console.log('🔢 Tokens utilizados:', data.usage?.total_tokens || 0);

    const content = data.choices[0].message.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const parsedContent = JSON.parse(content);
    console.log('📋 Conteúdo parseado:', JSON.stringify(parsedContent, null, 2));

    return {
      success: true,
      data: {
        title: parsedContent.title || 'Produto de Vestuário',
        description: parsedContent.description || 'Descrição não disponível',
        clothing_type: parsedContent.clothing_type || 'Produto de Vestuário',
        sleeve_type: parsedContent.sleeve_type || 'Curta',
        gender: parsedContent.gender || 'Sem gênero',
        color: parsedContent.color || 'Multicolorido',
        modelo: parsedContent.modelo || 'Produto Básico, Produto Casual, Produto Simples, Produto Essencial, Produto Versátil',
        tokensUsed: data.usage?.total_tokens || 0,
        responseTime: responseTime
      }
    };

  } catch (error: any) {
    console.error('❌ Erro na geração RÁPIDA com OpenAI:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para salvar descrição no banco (reutilizada da API original)
async function saveMarketplaceDescription(data: any) {
  try {
    const insertQuery = `
      INSERT INTO marketplace (
        product_id, title, description, openai_model, tokens_used, 
        tokens_prompt, tokens_completion, cost, request_id, response_time,
        max_tokens, temperature, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        openai_model = VALUES(openai_model),
        tokens_used = VALUES(tokens_used),
        tokens_prompt = VALUES(tokens_prompt),
        tokens_completion = VALUES(tokens_completion),
        cost = VALUES(cost),
        request_id = VALUES(request_id),
        response_time = VALUES(response_time),
        max_tokens = VALUES(max_tokens),
        temperature = VALUES(temperature),
        updated_at = NOW()
    `;

    const result = await executeQuery(insertQuery, [
      data.productId,
      data.title,
      data.description,
      data.openaiModel,
      data.tokensUsed,
      data.tokensPrompt,
      data.tokensCompletion,
      data.cost,
      data.requestId,
      data.responseTime,
      data.maxTokens,
      data.temperature
    ]);

    return {
      success: true,
      data: {
        id: result.insertId,
        product_id: data.productId,
        title: data.title,
        description: data.description
      }
    };
  } catch (error: any) {
    console.error('❌ Erro ao salvar descrição:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
