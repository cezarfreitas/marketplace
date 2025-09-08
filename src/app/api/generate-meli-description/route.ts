import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando geração de descrição do Marketplace...');
    
    const body = await request.json();
    console.log('📝 Body recebido:', body);
    
    const { productId, forceRegenerate = false } = body;

    if (!productId) {
      console.log('❌ productId não fornecido');
      return NextResponse.json({
        success: false,
        message: 'productId é obrigatório'
      }, { status: 400 });
    }

    console.log('🔄 Gerando descrição do Marketplace para produto ID:', productId);

    // 1. Buscar dados completos do produto
    console.log('🔍 Buscando dados do produto...');
    const productQuery = `
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;

    const products = await executeQuery(productQuery, [productId]);
    console.log('📊 Resultado da busca do produto:', products?.length || 0, 'registros');
    
    if (products.length === 0) {
      console.log('❌ Produto não encontrado');
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const product = products[0];
    console.log('📦 Produto encontrado:', product.name);

    // 2. Buscar análise de imagens mais recente
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
      
      const analyses = await executeQuery(analysisQuery, [productId]);
      console.log('📊 Análises encontradas:', analyses?.length || 0);
      
      if (analyses.length > 0) {
        imageAnalysis = analyses[0];
        console.log('🖼️ Análise de imagem encontrada');
      } else {
        console.log('🖼️ Nenhuma análise de imagem encontrada');
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar análise de imagens:', error);
    }

    // 3. Verificar se já existe descrição (se não for regeneração forçada)
    if (!forceRegenerate) {
      console.log('🔍 Verificando se já existe descrição...');
      const existingQuery = `SELECT * FROM meli WHERE product_id = ?`;
      const existing = await executeQuery(existingQuery, [productId]);
      console.log('📊 Descrições existentes:', existing?.length || 0);
      
      if (existing.length > 0) {
        console.log('✅ Descrição já existe, retornando...');
        return NextResponse.json({
          success: true,
          data: existing[0],
          message: 'Descrição já existe'
        });
      }
    }

    // 4. Gerar descrição usando OpenAI
    console.log('🤖 Chamando OpenAI...');
    const openaiResponse = await generateMeliDescriptionWithOpenAI(product, imageAnalysis);
    console.log('🤖 Resposta da OpenAI:', openaiResponse.success ? 'Sucesso' : 'Erro');
    
    if (!openaiResponse.success) {
      console.log('❌ Erro na OpenAI:', openaiResponse.error);
      return NextResponse.json({
        success: false,
        message: openaiResponse.error || 'Erro ao gerar descrição com IA'
      }, { status: 500 });
    }

    const { title, description, keywords, categoryId, condition, warranty, shippingInfo, tokensUsed } = openaiResponse.data || {};
    console.log('📝 Dados gerados:', { title: title?.substring(0, 50) + '...', description: description?.substring(0, 50) + '...' });

    // 5. Salvar no banco de dados
    console.log('💾 Salvando no banco de dados...');
    const saveResponse = await fetch(`${request.nextUrl.origin}/api/meli`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId,
        title,
        description,
        keywords,
        categoryId,
        condition,
        warranty,
        shippingInfo,
        tokensUsed,
        agentUsed: 'Agente Marketplace',
        modelUsed: 'gpt-4o-mini'
      })
    });

    const saveResult = await saveResponse.json();
    console.log('💾 Resultado do salvamento:', saveResult.success ? 'Sucesso' : 'Erro');
    
    if (!saveResult.success) {
      console.log('❌ Erro ao salvar:', saveResult.message);
      return NextResponse.json({
        success: false,
        message: 'Erro ao salvar descrição no banco de dados'
      }, { status: 500 });
    }

    console.log('✅ Descrição do Marketplace gerada com sucesso!');
    return NextResponse.json({
      success: true,
      data: {
        ...saveResult.data,
        title,
        description,
        keywords,
        categoryId,
        condition,
        warranty,
        shippingInfo,
        tokensUsed
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

async function generateMeliDescriptionWithOpenAI(product: any, imageAnalysis: any) {
  try {
    console.log('🤖 Iniciando geração com OpenAI...');
    console.log('📦 Produto:', product.name);
    console.log('🖼️ Análise de imagem:', imageAnalysis ? 'Disponível' : 'Não disponível');
    
    // Buscar chave da OpenAI das configurações do banco
    console.log('🔍 Buscando chave da OpenAI...');
    const settings = await executeQuery(`
      SELECT config_value 
      FROM system_config 
      WHERE config_key = 'openai_api_key'
    `);

    console.log('📊 Configurações encontradas:', settings?.length || 0);

    if (!settings || settings.length === 0) {
      console.log('⚠️ Chave da OpenAI não configurada no banco');
      throw new Error('Chave da API OpenAI não configurada. Configure em Configurações > IA.');
    }

    const openaiApiKey = settings[0].config_value;
    console.log('🔑 Chave da API OpenAI:', openaiApiKey ? 'Configurada' : 'NÃO CONFIGURADA');
    
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      console.log('⚠️ Chave da OpenAI está vazia');
      throw new Error('Chave da API OpenAI está vazia. Configure em Configurações > IA.');
    }

    console.log('✅ Chave da OpenAI encontrada, continuando...');

    // Construir prompt para o Marketplace
    const systemPrompt = `Você é um especialista em e-commerce e marketing digital, focado especificamente no Marketplace. Sua tarefa é criar títulos e descrições otimizadas para produtos de moda e vestuário que maximizem a visibilidade e conversão no Marketplace.

REGRAS IMPORTANTES:
1. Título deve ter entre 60-100 caracteres (limite do Marketplace)
2. Descrição deve ser entre 400-800 palavras, estruturada e detalhada
3. Use palavras-chave relevantes para SEO
4. Inclua informações técnicas e de qualidade
5. Seja persuasivo mas honesto
6. Foque nos benefícios para o cliente
7. Use linguagem clara e direta
8. Estruture a descrição com seções organizadas

ESTRUTURA DA DESCRIÇÃO:
- Parágrafo introdutório sobre o produto
- Informações sobre a marca e qualidade
- Detalhes técnicos e materiais
- Benefícios e características
- Seção "Destaques do produto" com bullet points
- Seção "Material e cuidados"
- Seção "Por que escolher" com vantagens
- Seção "FAQ - Perguntas frequentes" com 4-5 perguntas
- Call-to-action final

FORMATO DE RESPOSTA (JSON):
{
  "title": "título otimizado",
  "description": "descrição completa estruturada",
  "keywords": "palavra1, palavra2, palavra3",
  "categoryId": "MLB123456",
  "condition": "new",
  "warranty": "Garantia do fabricante",
  "shippingInfo": "Frete grátis para todo Brasil"
}`;

    const userPrompt = `Crie uma descrição otimizada para o Marketplace para este produto:

PRODUTO ORIGINAL: ${product.name}
REF_ID: ${product.ref_id || 'N/A'}
MARCA: ${product.brand_name || 'N/A'}
CATEGORIA: ${product.category_name || 'N/A'}
DESCRIÇÃO ATUAL: ${product.description || 'N/A'}
TÍTULO ATUAL: ${product.title || 'N/A'}

${imageAnalysis ? `
ANÁLISE TÉCNICA DAS IMAGENS:
${imageAnalysis.contextual_analysis}
` : ''}

IMPORTANTE: 
- Crie um NOVO TÍTULO otimizado (não use o nome original do produto)
- Na descrição, use o NOVO TÍTULO que você criou, não o nome original
- O novo título deve ser mais atrativo e otimizado para SEO

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

EXEMPLO DE ESTRUTURA:
"[Novo Título] foi desenvolvido para quem busca [benefício principal]... 

A marca [Marca] é reconhecida por [características da marca]...

Fabricado em [material], o produto oferece [benefícios técnicos]...

Destaques do produto:
• [Característica 1]: [benefício]
• [Característica 2]: [benefício]

Material e cuidados:
Material principal: [material]
Cuidados de limpeza: [instruções]

Por que escolher [Novo Título]:
• [Vantagem 1]
• [Vantagem 2]

FAQ – Perguntas frequentes:
[Pergunta 1]?
[Resposta 1]

[Pergunta 2]?
[Resposta 2]

Garanta agora o [Novo Título] e [call-to-action]."

Retorne APENAS o JSON com as informações solicitadas.`;

    console.log('🌐 Chamando API da OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 3000,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro na API OpenAI:', response.status, errorData);
      throw new Error(`Erro na API OpenAI: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Resposta da OpenAI recebida');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Resposta inválida da OpenAI');
    }

    const content = data.choices[0].message.content;
    console.log('📝 Conteúdo recebido:', content?.substring(0, 100) + '...');

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      throw new Error('Resposta da OpenAI não é um JSON válido');
    }

    return {
      success: true,
      data: {
        title: parsedContent.title || 'Título não gerado',
        description: parsedContent.description || 'Descrição não gerada',
        keywords: parsedContent.keywords || '',
        categoryId: parsedContent.categoryId || 'MLB12345',
        condition: parsedContent.condition || 'new',
        warranty: parsedContent.warranty || 'Garantia de 30 dias contra defeitos de fabricação',
        shippingInfo: parsedContent.shippingInfo || 'Frete grátis para todo o Brasil',
        tokensUsed: data.usage?.total_tokens || 0
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