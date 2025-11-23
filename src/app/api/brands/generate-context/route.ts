import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';

export async function POST(request: NextRequest) {
  try {
    console.log('\n🎨 =====================================');
    console.log('🎨 GERAÇÃO DE CONTEXTO DE MARCA INICIADA');
    console.log('🎨 =====================================\n');

    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { brandId, brandName, brandDescription, existingInfo } = await request.json();
    
    console.log('📋 Dados recebidos:');
    console.log('   - Brand ID:', brandId);
    console.log('   - Brand Name:', brandName);
    console.log('   - Description:', brandDescription?.substring(0, 100) + '...');
    console.log('   - Existing Info:', existingInfo);
    
    if (!brandId || !brandName || !brandDescription) {
      console.log('❌ Erro: Dados obrigatórios faltando');
      return NextResponse.json({
        success: false,
        message: 'ID da marca, nome e descrição são obrigatórios'
      }, { status: 400 });
    }


    // Verificar se a chave da OpenAI está configurada
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      console.log('❌ Erro: Chave da OpenAI não configurada');
      return NextResponse.json({
        success: false,
        message: 'Chave da OpenAI não configurada. Configure a variável OPENAI_API_KEY no ambiente.'
      }, { status: 400 });
    }

    console.log('✅ Chave da OpenAI: Configurada');

    // Preparar prompt otimizado e conciso para a OpenAI
    const systemPrompt = `Você é um especialista em branding de moda e e-commerce. Crie contextos de marca concisos, autênticos e úteis para descrições de produtos. Seja direto, preciso e focado no que importa para vender.`;

    const userPrompt = `Crie um contexto direto e útil para a marca **${brandName}**:

**INFORMAÇÕES:**
- Marca: ${brandName}
- Sobre: ${brandDescription}
- Tagline: ${existingInfo?.title || 'Não informado'}

**ESTRUTURA (seja conciso e direto):**

**1. ESSÊNCIA DA MARCA**
- Propósito, valores e o que torna única (2-3 frases)

**2. PÚBLICO-ALVO**
- Quem compra: perfil, estilo de vida, idade aproximada (2-3 frases)

**3. ESTILO E IDENTIDADE**
- Personalidade da marca (5-8 adjetivos: ex: urbana, rebelde, sofisticada, casual)
- Estética e DNA visual

**4. PRODUTOS**
- Categorias principais e diferenciais
- Posicionamento (premium, médio, popular)

**5. TOM DE VOZ**
- Como a marca se comunica (formal/informal, técnico/emocional)
- 8-10 palavras-chave para usar em descrições
- O que evitar na comunicação

**6. PARA DESCRIÇÕES DE PRODUTOS**
- Como aplicar este contexto nas descrições
- Exemplo de frase de abertura típica da marca

⚠️ IMPORTANTE:
- Seja DIRETO e OBJETIVO (máximo 800-1000 palavras)
- Foque no que é ÚTIL para criar descrições de produtos
- Use linguagem clara e profissional
- Se faltam informações, infira pelo posicionamento da marca`;

    console.log('\n🤖 Preparando chamada para OpenAI...');
    console.log('   - Modelo: gpt-4o-mini');
    console.log('   - Max Tokens: 1500 (otimizado para velocidade)');
    console.log('   - Temperature: 0.7');
    console.log('   - Prompt: Conciso e direto (6 seções)');

    // Chamar API da OpenAI com GPT-4o-mini (otimizado)
    const startTime = Date.now();
    console.log('⏳ Chamando API da OpenAI...');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    const responseTime = Date.now() - startTime;
    console.log(`⏱️  Tempo de resposta: ${responseTime}ms`);

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('❌ Erro da OpenAI:', errorData);
      console.error('   - Status:', openaiResponse.status);
      console.error('   - Error Message:', errorData.error?.message || 'Erro desconhecido');
      return NextResponse.json({
        success: false,
        message: 'Erro ao gerar contexto com OpenAI: ' + (errorData.error?.message || 'Erro desconhecido')
      }, { status: 500 });
    }

    console.log('✅ Resposta recebida da OpenAI');

    const openaiData = await openaiResponse.json();
    const generatedContext = openaiData.choices[0]?.message?.content;

    if (!generatedContext) {
      console.error('❌ Resposta vazia da OpenAI');
      return NextResponse.json({
        success: false,
        message: 'Resposta vazia da OpenAI'
      }, { status: 500 });
    }

    console.log('📊 Estatísticas do contexto gerado:');
    console.log('   - Tamanho: ' + generatedContext.length + ' caracteres');
    console.log('   - Tokens usados (prompt):', openaiData.usage?.prompt_tokens || 'N/A');
    console.log('   - Tokens usados (completion):', openaiData.usage?.completion_tokens || 'N/A');
    console.log('   - Total de tokens:', openaiData.usage?.total_tokens || 'N/A');

    console.log('\n✅ =====================================');
    console.log('✅ CONTEXTO GERADO COM SUCESSO!');
    console.log('✅ =====================================\n');

    return NextResponse.json({
      success: true,
      message: 'Contexto gerado com sucesso!',
      data: {
        context: generatedContext
      }
    });

  } catch (error: any) {
    console.error('\n❌ =====================================');
    console.error('❌ ERRO AO GERAR CONTEXTO');
    console.error('❌ =====================================');
    console.error('❌ Erro:', error);
    console.error('❌ Message:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ =====================================\n');
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao gerar contexto'
    }, { status: 500 });
  }
}
