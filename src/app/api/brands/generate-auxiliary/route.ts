import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

interface AuxiliaryData {
  brand_analysis: string;
}

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { brandId, guidelines, saveData, auxiliaryData: requestAuxiliaryData } = await request.json();
    
    if (!brandId) {
      return NextResponse.json({
        success: false,
        message: 'ID da marca é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔄 Gerando dados auxiliares para marca ID: ${brandId}`);

    // Buscar informações da marca
    const brandRows = await executeQuery(`
      SELECT id, name, title, meta_tag_description, image_url
      FROM brands 
      WHERE id = ?
    `, [brandId]);

    if (!brandRows || brandRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Marca não encontrada'
      }, { status: 404 });
    }

    const brand = brandRows[0] as any;
    console.log(`📊 Marca encontrada: ${brand.name}`);

    // Buscar agente para análise de marcas
    const agentRows = await executeQuery(`
      SELECT name, model, max_tokens, temperature, system_prompt, guidelines_template
      FROM agents 
      WHERE function_type = 'brand_analysis' AND is_active = TRUE
      ORDER BY id ASC
      LIMIT 1
    `);

    if (!agentRows || agentRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum agente configurado para análise de marcas. Configure em Agentes.'
      }, { status: 400 });
    }

    const agent = agentRows[0] as any;
    console.log(`🤖 Usando agente: ${agent.name} (${agent.model})`);

    // Buscar chave da OpenAI
    const configRows = await executeQuery(`
      SELECT config_value 
      FROM system_config 
      WHERE config_key = 'openai_api_key'
    `);

    if (!configRows || configRows.length === 0 || !configRows[0].config_value) {
      return NextResponse.json({
        success: false,
        message: 'Chave da OpenAI não configurada. Configure em Configurações > IA.'
      }, { status: 400 });
    }

    const openaiKey = configRows[0].config_value;
    console.log('🔑 Chave da OpenAI encontrada');

    // Preparar prompt para a OpenAI
    const guidelinesText = guidelines ? `\n\nDIRETRIZES ESPECÍFICAS:\n${guidelines}` : '';
    const systemPrompt = agent.system_prompt || 'Você é um especialista em marketing digital e SEO.';
    
    const prompt = `${systemPrompt}

Analise a marca "${brand.name}" e gere uma análise completa e rica em um único texto estruturado.

INFORMAÇÕES DISPONÍVEIS:
- Nome: ${brand.name}
- Título: ${brand.title || 'Não informado'}
- Descrição: ${brand.meta_tag_description || 'Não informado'}${guidelinesText}

GERE UM JSON com uma análise completa da marca:

{
  "brand_analysis": "ANÁLISE COMPLETA DA MARCA ${brand.name.toUpperCase()}

## INFORMAÇÕES BÁSICAS
- Nome: ${brand.name}
- Posicionamento: [defina o posicionamento da marca no mercado]
- Categoria: [categoria principal de produtos/serviços]

## PÚBLICO-ALVO
- Demografia: [idade, gênero, classe social, localização]
- Psicografia: [estilo de vida, interesses, valores, comportamentos]
- Persona: [descrição detalhada do consumidor ideal]

## IDENTIDADE DA MARCA
- História: [origem, evolução, marcos importantes]
- Missão: [propósito da marca]
- Valores: [princípios fundamentais]
- Personalidade: [como a marca se comporta e comunica]
- Tom de voz: [estilo de comunicação - formal, jovem, técnico, etc.]

## IDENTIDADE VISUAL
- Cores: [paleta de cores e significados]
- Tipografia: [estilo de fontes]
- Estilo visual: [elementos gráficos, imagens, sensações]
- Identidade emocional: [que sentimentos a marca transmite]

## POSICIONAMENTO ESTRATÉGICO
- Posicionamento de preço: [premium, médio, popular, acessível]
- Vantagens competitivas: [o que diferencia da concorrência]
- Proposta de valor: [benefícios únicos oferecidos]

## COMPORTAMENTO DE CONSUMO
- Padrões de compra: [quando, como, onde compram]
- Fatores de decisão: [o que mais valorizam]
- Influências: [o que os influencia na decisão]
- Frequência: [com que frequência consomem]

## ESTRATÉGIAS DE MARKETING
- Canais preferidos: [onde a marca deve estar presente]
- Tipos de conteúdo: [formato de conteúdo que funciona]
- Momentos de compra: [quando são mais receptivos]
- Call-to-actions: [frases que geram ação]

## OTIMIZAÇÃO SEO
- Palavras-chave principais: [keywords relevantes]
- Long-tail keywords: [frases específicas]
- Títulos otimizados: [sugestões de títulos para SEO]
- Meta descrições: [descrições atrativas para busca]

## SUGESTÕES DE CONTEÚDO
- Temas relevantes: [assuntos que interessam ao público]
- Formatos ideais: [vídeo, texto, imagem, etc.]
- Frequência: [com que frequência publicar]
- Estratégias: [abordagens específicas para engajamento]

## RECOMENDAÇÕES FINAIS
- Foco principal: [área que deve receber mais atenção]
- Oportunidades: [chances de crescimento]
- Cuidados: [pontos de atenção]
- Próximos passos: [ações recomendadas]"
}

IMPORTANTE: 
- Seja específico e detalhado
- Use linguagem natural e envolvente
- Foque em informações práticas para marketing e SEO
- Considere o contexto brasileiro quando relevante
- Estruture o texto de forma clara e organizada
- Responda APENAS com o JSON, sem explicações adicionais`;

    // Chamar API da OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: parseInt(agent.max_tokens),
        temperature: parseFloat(agent.temperature)
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('❌ Erro da OpenAI:', errorData);
      return NextResponse.json({
        success: false,
        message: 'Erro ao gerar dados com OpenAI: ' + (errorData.error?.message || 'Erro desconhecido')
      }, { status: 500 });
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0]?.message?.content;

    if (!generatedContent) {
      return NextResponse.json({
        success: false,
        message: 'Resposta vazia da OpenAI'
      }, { status: 500 });
    }

    console.log('🤖 Resposta da OpenAI recebida');
    console.log('📄 Conteúdo gerado:', generatedContent.substring(0, 500) + '...');

    // Parsear JSON da resposta
    let auxiliaryData: AuxiliaryData;
    try {
      auxiliaryData = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError);
      console.error('📄 Conteúdo que causou erro:', generatedContent);
      return NextResponse.json({
        success: false,
        message: 'Erro ao processar resposta da OpenAI: ' + (parseError instanceof Error ? parseError.message : String(parseError))
      }, { status: 500 });
    }

    // Se saveData for true, salvar no banco
    if (saveData && requestAuxiliaryData) {
      await executeQuery(`
        UPDATE brands 
        SET 
          brand_analysis = ?,
          auxiliary_data_generated = TRUE,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        requestAuxiliaryData.brand_analysis,
        brandId
      ]);

      console.log(`✅ Dados auxiliares salvos para marca: ${brand.name}`);

      return NextResponse.json({
        success: true,
        message: 'Dados auxiliares salvos com sucesso!',
        data: requestAuxiliaryData
      });
    }

    // Retornar apenas os dados gerados (sem salvar)
    return NextResponse.json({
      success: true,
      message: 'Dados auxiliares gerados com sucesso!',
      data: auxiliaryData
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar dados auxiliares:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao gerar dados auxiliares'
    }, { status: 500 });
  }
}
