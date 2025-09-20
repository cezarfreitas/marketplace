import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { brandId, brandName, brandDescription, existingInfo } = await request.json();
    
    if (!brandId || !brandName || !brandDescription) {
      return NextResponse.json({
        success: false,
        message: 'ID da marca, nome e descrição são obrigatórios'
      }, { status: 400 });
    }


    // Verificar se a chave da OpenAI está configurada
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      return NextResponse.json({
        success: false,
        message: 'Chave da OpenAI não configurada. Configure a variável OPENAI_API_KEY no ambiente.'
      }, { status: 400 });
    }

    // Preparar prompt para a OpenAI
    const prompt = `Gere contexto completo e detalhado para "${brandName}":

INFORMAÇÕES:
- Marca: ${brandName}
- Descrição: ${brandDescription}
- Título: ${existingInfo?.title || 'Não informado'}

FORMATO:

**HISTÓRICO**
- Origem, fundação e evolução da marca

**PÚBLICO-ALVO**
- Faixa etária, gênero, classe social e estilo de vida dos clientes

**PRODUTOS**
- Categorias principais, características e diferenciais dos produtos

**TOM DE VOZ**
- Linguagem, estilo e palavras-chave para descrever produtos

**VALORES**
- Princípios e propostas de valor da marca

REGRAS:
- Contexto rico e completo para descrições de produtos
- Incluir faixa etária e perfil detalhado
- Tom de voz específico e palavras-chave
- Texto útil para e-commerce
- Seja detalhado e abrangente`;

    // Chamar API da OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('❌ Erro da OpenAI:', errorData);
      return NextResponse.json({
        success: false,
        message: 'Erro ao gerar contexto com OpenAI: ' + (errorData.error?.message || 'Erro desconhecido')
      }, { status: 500 });
    }

    const openaiData = await openaiResponse.json();
    const generatedContext = openaiData.choices[0]?.message?.content;

    if (!generatedContext) {
      return NextResponse.json({
        success: false,
        message: 'Resposta vazia da OpenAI'
      }, { status: 500 });
    }


    return NextResponse.json({
      success: true,
      message: 'Contexto gerado com sucesso!',
      data: {
        context: generatedContext
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar contexto:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao gerar contexto'
    }, { status: 500 });
  }
}
