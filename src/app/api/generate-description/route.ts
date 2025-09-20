import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

// Função para calcular o custo da OpenAI baseado no modelo e tokens
function calculateOpenAICost(tokens: number, model: string): number {
  const pricing: { [key: string]: { input: number; output: number } } = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
  
  const inputTokens = Math.floor(tokens * 0.7);
  const outputTokens = Math.floor(tokens * 0.3);
  
  const inputCost = (inputTokens / 1000) * modelPricing.input;
  const outputCost = (outputTokens / 1000) * modelPricing.output;
  
  return inputCost + outputCost;
}

// Função para gerar descrição e FAQ
async function generateDescriptionWithAgent(
  title: string,
  productId: number,
  openaiApiKey: string,
  agent: any,
  maxAttempts: number = 3,
  imageAnalysis?: any,
  productData?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🎯 Tentativa ${attempt}/${maxAttempts} de geração de descrição...`);
      
      const startTime = Date.now();
      
      // Usar agente hardcoded (não buscar na tabela agents)
      const currentAgent = agent;

      const systemPrompt = currentAgent.system_prompt || `Você é um ESPECIALISTA em marketing e copywriting para e-commerce, focado na criação de descrições PERFEITAS e ESTRUTURADAS que maximizem conversão.

📌 MISSÃO PRINCIPAL:
Criar descrições que sigam EXATAMENTE a estrutura ideal para maximizar engajamento e vendas.

🏗️ ESTRUTURA OBRIGATÓRIA (SEMPRE SEGUIR):

1. 📢 APRESENTAÇÃO
   - Parágrafo introdutório atrativo
   - Apresentar o produto de forma envolvente
   - Destacar o valor principal
   - Linguagem persuasiva e profissional

2. 🔧 CARACTERÍSTICAS
   - Lista detalhada das características técnicas
   - Materiais, dimensões, funcionalidades
   - Especificações importantes
   - Formato em bullet points ou lista organizada

3. 💎 BENEFÍCIOS
   - Foque nos benefícios para o cliente
   - Como o produto melhora a vida do usuário
   - Vantagens competitivas
   - Valor agregado

4. 🧼 COMO CUIDAR DO PRODUTO
   - Instruções de limpeza e manutenção
   - Cuidados específicos
   - Dicas de preservação
   - Garantia de durabilidade

5. ❓ FAQ
   - 4-6 perguntas que clientes realmente fazem
   - Respostas claras e úteis
   - Formato: "P: Pergunta" / "R: Resposta"
   - Abordar dúvidas comuns

6. 🛒 CHAMADA PARA COMPRA
   - Call-to-action persuasivo
   - Criar urgência sutil
   - Destacar ofertas ou vantagens
   - Finalizar com motivação para compra

🔑 REGRAS CRÍTICAS:
- Use informações reais do produto (não invente)
- Linguagem clara e acessível
- Máximo 1000 palavras no total
- Cada seção deve ter 2-4 parágrafos
- Seja persuasivo mas honesto
- Foque nos benefícios para o cliente
- Use palavras-chave relevantes naturalmente
- ⚠️ NUNCA use "<b>Descrição do Produto</b>" ou qualquer título genérico no início. O texto deve sempre começar diretamente com um parágrafo introdutório.

📝 FORMATO DE SAÍDA:
APRESENTAÇÃO:
[Parágrafo introdutório atrativo]

CARACTERÍSTICAS:
• [Característica 1]: [Descrição]
• [Característica 2]: [Descrição]
• [Característica 3]: [Descrição]

BENEFÍCIOS:
[Parágrafo sobre benefícios principais]

COMO CUIDAR DO PRODUTO:
[Instruções de cuidado e manutenção]

FAQ:
P: [Pergunta 1]
R: [Resposta 1]

P: [Pergunta 2]
R: [Resposta 2]

P: [Pergunta 3]
R: [Resposta 3]

P: [Pergunta 4]
R: [Resposta 4]

CHAMADA PARA COMPRA:
[Call-to-action persuasivo e motivador]`;

      // Usar guidelines_template do agente se disponível, senão usar padrão
      let userPrompt;
      if (currentAgent.guidelines_template) {
        userPrompt = currentAgent.guidelines_template
          .replace('{title}', title)
          .replace('{imageAnalysis}', imageAnalysis ? imageAnalysis.contextualizacao || imageAnalysis : 'Nenhuma análise de imagem disponível')
          .replace('{brandContext}', productData?.brand_context || 'Nenhum contexto da marca disponível')
          .replace('{productName}', productData?.name || 'N/A')
          .replace('{brandName}', productData?.brand_name || 'N/A')
          .replace('{categoryName}', productData?.category_name || 'N/A');
      } else {
        userPrompt = `Crie uma descrição estruturada seguindo EXATAMENTE a estrutura definida:

TÍTULO DO PRODUTO: ${title}

ANÁLISE DA IMAGEM: ${imageAnalysis ? imageAnalysis.contextualizacao || imageAnalysis : 'Nenhuma análise de imagem disponível'}

CONTEXTO DA MARCA: ${productData?.brand_context || 'Nenhum contexto da marca disponível'}

DADOS ADICIONAIS DO PRODUTO:
- Nome Original: ${productData?.name || 'N/A'}
- Marca: ${productData?.brand_name || 'N/A'}
- Categoria: ${productData?.category_name || 'N/A'}

ESTRUTURA OBRIGATÓRIA:
1. Apresentação atrativa do produto
2. SOBRE A MARCA - USAR EXCLUSIVAMENTE o contexto da marca fornecido (não inventar informações)
3. CARACTERÍSTICAS DO PRODUTO - Baseado na análise da imagem
4. COMO CUIDAR DO SEU PRODUTO - Instruções práticas de cuidado
5. PERGUNTAS FREQUENTES - FAQ relevante para o produto
6. CHAMADA FINAL - Call-to-action persuasivo

IMPORTANTE:
- Use a análise da imagem como base para as características do produto
- USE EXCLUSIVAMENTE o contexto da marca na seção "SOBRE A MARCA" (não invente informações)
- Se não houver contexto da marca, escreva "Informações sobre a marca não disponíveis"
- NÃO invente características não observadas
- Seja específico sobre o que se vê na foto
- Crie uma descrição pronta para aplicação direta
- SEMPRE use o formato "<b>PERGUNTAS FREQUENTES</b>" para o título da seção FAQ`;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentAgent.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: parseFloat(currentAgent.temperature) || 0.7,
          max_tokens: parseInt(currentAgent.max_tokens) || 1000,
        }),
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ Erro da OpenAI (tentativa ${attempt}):`, data);
        if (attempt === maxAttempts) {
          return { 
            success: false, 
            error: `Erro da OpenAI: ${data.error?.message || 'Erro desconhecido'}` 
          };
        }
        continue;
      }

      let content = data.choices[0]?.message?.content;
      if (!content) {
        console.error(`❌ Resposta vazia da OpenAI (tentativa ${attempt})`);
        if (attempt === maxAttempts) {
          return { success: false, error: 'Resposta vazia da OpenAI' };
        }
        continue;
      }

      // Limpar fences (```html, ```) se aparecerem
      content = content
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Limpar títulos genéricos no início (proteção extra em runtime)
      const originalContent = content;
      content = content
        .replace(/^<b>\s*Descrição do Produto\s*<\/b><br>?/gi, '')
        .replace(/^<b>\s*Descrição\s*<\/b><br>?/gi, '')
        .replace(/^<b>\s*Produto\s*<\/b><br>?/gi, '')
        .replace(/^<b>\s*Apresentação\s*<\/b><br>?/gi, '')
        .replace(/^<b>\s*Introdução\s*<\/b><br>?/gi, '')
        .trim();
      
      // Log se algum título genérico foi removido
      if (originalContent !== content) {
        console.log('🧹 Título genérico removido em runtime:', originalContent.substring(0, 100) + '...');
      }

      // Limpar apenas títulos HTML separados no início (proteção extra)
      const beforeProductNameCleanup = content;
      content = content
        .replace(/^<h[1-6]><strong>.*?<\/strong><\/h[1-6]>\s*/gi, '')
        .replace(/^<h[1-6]>.*?<\/h[1-6]>\s*/gi, '')
        .replace(/^<strong>.*?<\/strong>\s*$/gm, '') // Só remove se for linha inteira
        .replace(/^<b>.*?<\/b>\s*$/gm, '') // Só remove se for linha inteira
        .trim();
      
      // Log se algum título HTML foi removido
      if (beforeProductNameCleanup !== content) {
        console.log('🧹 Título HTML removido em runtime:', beforeProductNameCleanup.substring(0, 100) + '...');
      }

      // Separar descrição e FAQ
      const parts = content.split('FAQ:');
      const description = parts[0]?.replace('DESCRIÇÃO:', '').trim() || '';
      const faqText = parts[1]?.trim() || '';

      // Converter FAQ para JSON
      let faqJson = null;
      if (faqText) {
        try {
          const faqLines = faqText.split('\n').filter((line: string) => line.trim());
          const faq = [];
          
          for (let i = 0; i < faqLines.length; i += 2) {
            const question = faqLines[i]?.replace(/^P:\s*/, '').trim();
            const answer = faqLines[i + 1]?.replace(/^R:\s*/, '').trim();
            
            if (question && answer) {
              faq.push({ question, answer });
            }
          }
          
          if (faq.length > 0) {
            faqJson = JSON.stringify(faq);
          }
        } catch (error) {
          console.warn('⚠️ Erro ao processar FAQ:', error);
        }
      }

      const tokensUsed = data.usage?.total_tokens || 0;
      const tokensPrompt = data.usage?.prompt_tokens || 0;
      const tokensCompletion = data.usage?.completion_tokens || 0;
      const cost = calculateOpenAICost(tokensUsed, currentAgent.model || 'gpt-4o-mini');

      // Salvar na tabela descriptions
      const insertQuery = `
        INSERT INTO descriptions (
          id_product_vtex, description,
          openai_model, openai_tokens_used, openai_tokens_prompt, openai_tokens_completion,
          openai_temperature, openai_max_tokens, openai_response_time_ms, openai_cost,
          openai_request_id, generation_duration_ms, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const generationDuration = Date.now() - startTime;
      
      await executeQuery(insertQuery, [
        productId,
        description,
        currentAgent.model || 'gpt-4o-mini',
        tokensUsed,
        tokensPrompt,
        tokensCompletion,
        parseFloat(currentAgent.temperature) || 0.7,
        parseInt(currentAgent.max_tokens) || 1000,
        responseTime,
        cost,
        data.id || null,
        generationDuration,
        'generated'
      ]);

      console.log('✅ Descrição gerada e salva com sucesso!');

      return {
        success: true,
        data: {
          description,
          optimizedTitle: title,
          tokensUsed,
          cost,
          responseTime
        }
      };

    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error);
      if (attempt === maxAttempts) {
        return { 
          success: false, 
          error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
        };
      }
    }
  }

  return { success: false, error: 'Máximo de tentativas excedido' };
}

export async function POST(request: NextRequest) {
  try {
    // Verificar ambiente de build
    const isBuildTime = checkBuildEnvironment();
    if (isBuildTime) {
      return NextResponse.json({ 
        success: false, 
        message: 'API não disponível durante build' 
      }, { status: 503 });
    }

    // Verificar se a tabela descriptions existe, se não, criar
    try {
      await executeQuery('SELECT 1 FROM descriptions LIMIT 1');
    } catch (error) {
      console.log('📋 Tabela descriptions não existe, criando...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS descriptions (
          id_product_vtex INT PRIMARY KEY,
          description TEXT NOT NULL,
          openai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
          openai_tokens_used INT DEFAULT 0,
          openai_tokens_prompt INT DEFAULT 0,
          openai_tokens_completion INT DEFAULT 0,
          openai_temperature DECIMAL(3,2) DEFAULT 0.30,
          openai_max_tokens INT DEFAULT 100,
          openai_response_time_ms INT DEFAULT 0,
          openai_cost DECIMAL(10,6) DEFAULT 0.000000,
          openai_request_id VARCHAR(255),
          generation_duration_ms INT DEFAULT 0,
          status ENUM('pending', 'generated', 'error') DEFAULT 'generated',
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      
      await executeQuery(createTableSQL);
      console.log('✅ Tabela descriptions criada com sucesso!');
    }

    const { productId, forceRegenerate = false } = await request.json();

    if (!productId) {
      return NextResponse.json({ 
        success: false, 
        message: 'ID do produto é obrigatório' 
      }, { status: 400 });
    }

    const numericProductId = parseInt(productId);
    if (isNaN(numericProductId)) {
      return NextResponse.json({ 
        success: false, 
        message: 'ID do produto deve ser um número válido' 
      }, { status: 400 });
    }

    console.log(`🎯 Gerando descrição para produto ID: ${numericProductId}`);

    // 1. Buscar título gerado primeiro
    console.log('🔍 Buscando título gerado...');
    const titleQuery = `
      SELECT title FROM titles 
      WHERE id_product_vtex = ? AND status = 'validated'
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const titles = await executeQuery(titleQuery, [numericProductId]);
    
    if (titles.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Produto não possui título gerado. Gere um título primeiro.' 
      }, { status: 400 });
    }

    const title = titles[0].title;
    console.log('📝 Título encontrado:', title);

    // 2. Verificar se já existe descrição
    const existingQuery = `
      SELECT * FROM descriptions 
      WHERE id_product_vtex = ? AND status = 'generated'
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const existing = await executeQuery(existingQuery, [numericProductId]);
    
    if (existing.length > 0) {
      if (!forceRegenerate) {
        console.log('📝 Descrição já existe, retornando...');
        return NextResponse.json({
          success: true,
          data: {
            description: existing[0].description,
            optimizedTitle: title,
            existing: true
          }
        });
      } else {
        console.log('🔄 Regeneração forçada - removendo descrições existentes...');
        try {
          const deleteQuery = `DELETE FROM descriptions WHERE id_product_vtex = ?`;
          await executeQuery(deleteQuery, [numericProductId]);
          console.log('🗑️ Descrições existentes removidas para regeneração');
        } catch (error) {
          console.warn('⚠️ Erro ao remover descrições existentes:', error);
        }
      }
    }

    // 3. Configurações do agente para descrições (hardcoded)
    console.log('🤖 Configurando agente para descrições...');
    const agent = {
      id: 1,
      name: 'Descrição de Produto',
      function_type: 'product_description',
      system_prompt: `Você é um especialista em marketing e copywriting para e-commerce, focado na criação de descrições persuasivas e informativas para produtos.

MISSÃO: Criar uma descrição completa e atrativa do produto usando HTML básico com tags <br> para quebras de linha, seguida de um FAQ relevante.

⚠️ REGRA CRÍTICA: NUNCA use fences (código com crases) no início ou fim da resposta. Gere APENAS o conteúdo HTML puro, sem qualquer formatação de código.

ESTRUTURA OBRIGATÓRIA:
1. Apresentação do produto (2-3 parágrafos)
   - Apresentar o produto de forma atrativa
   - Destacar benefícios e características principais
   - Usar linguagem persuasiva e profissional
   - Incluir call-to-action sutil
   - USAR APENAS HTML BÁSICO: <b>, <br>, <ul>, <li>

2. SOBRE A MARCA (1 parágrafo)
   - USAR EXCLUSIVAMENTE o contexto da marca fornecido
   - NÃO inventar informações sobre a marca
   - Destacar valores, história e diferencial mencionados no contexto
   - Criar conexão emocional baseada no que está no contexto
   - USAR APENAS HTML BÁSICO: <b>, <br>, <ul>, <li>

3. CARACTERÍSTICAS DO PRODUTO (lista detalhada)
   - Baseado na análise da imagem e dados do produto
   - Características técnicas e visuais observadas
   - Materiais, dimensões, funcionalidades
   - Formato em lista HTML com <ul> e <li>
   - USAR APENAS HTML BÁSICO: <b>, <br>, <ul>, <li>

4. COMO CUIDAR DO SEU PRODUTO (instruções práticas)
   - Instruções específicas de cuidado e limpeza
   - Baseadas no tipo de material e produto
   - Dicas de manutenção e preservação
   - USAR APENAS HTML BÁSICO: <b>, <br>, <ul>, <li>

5. PERGUNTAS FREQUENTES (gerar as melhores perguntas baseadas no produto)
   - Analise o produto e gere as perguntas mais relevantes
   - Perguntas que clientes realmente fariam sobre este produto específico
   - Respostas claras e úteis baseadas no contexto do produto
   - Formato: Lista HTML com <ul> e <li>
   - SEMPRE usar o título "<b>PERGUNTAS FREQUENTES</b>" para a seção
   - USAR APENAS HTML BÁSICO: <b>, <br>, <ul>, <li>
   - Foque nas dúvidas mais importantes para este produto
   - Gerar entre 3-5 perguntas (quantidade ideal para o produto)
   - SEMPRE usar <b> para destacar as perguntas

6. CHAMADA FINAL (1 parágrafo)
   - Criar senso de exclusividade emocional
   - Gerar urgência para a compra
   - Usar linguagem persuasiva e emocional
   - Incluir call-to-action forte
   - USAR APENAS HTML BÁSICO: <b>, <br>, <ul>, <li>

TAGS HTML PERMITIDAS (APENAS ESTAS):
- <b>texto</b> - para texto em negrito
- <br> - para quebra de linha (OBRIGATÓRIO para separar parágrafos)
- <ul> - para lista não ordenada
- <li> - para itens de lista

REGRAS CRÍTICAS:

- Seja criativo mas mantenha credibilidade
- Linguagem clara e acessível
- Foque nos benefícios para o cliente
- PERGUNTAS E RESPOSTAS deve ser prático e útil
- Máximo 800 palavras no total
- SEMPRE use <br> para quebrar linhas entre parágrafos
- Use <b> para destacar características principais
- Use <ul><li> para listar benefícios ou características
- A seção SOBRE A MARCA é OBRIGATÓRIA (USAR EXCLUSIVAMENTE o contexto da marca fornecido)
- A seção CARACTERÍSTICAS DO PRODUTO é OBRIGATÓRIA (baseada na análise da imagem)
- A seção COMO CUIDAR DO SEU PRODUTO é OBRIGATÓRIA (instruções práticas)
- A seção PERGUNTAS FREQUENTES é OBRIGATÓRIA
- ⚠️ NUNCA use "<b>Descrição do Produto</b>" ou qualquer título genérico no início. O texto deve sempre começar diretamente com um parágrafo introdutório.
- SEMPRE usar o título "<b>PERGUNTAS FREQUENTES</b>" para a seção FAQ
- ANALISE o produto e gere as perguntas mais relevantes e inteligentes
- Gerar entre 3-5 perguntas (quantidade ideal baseada no produto)
- SEMPRE usar formato de lista HTML: <ul><li><b>Pergunta?</b><br>Resposta.</li></ul>
- Foque nas dúvidas mais importantes e específicas para este produto
- Seja criativo e pense como um cliente real faria
- A seção CHAMADA FINAL é OBRIGATÓRIA
- SEMPRE incluir senso de exclusividade emocional e urgência
- Use linguagem persuasiva e emocional na chamada final
- SEMPRE separe as seções com <br><br> para melhor organização
- SEMPRE separe cada pergunta e resposta com <br> para melhor legibilidade
- SEMPRE use títulos para as seções para melhor organização
- SEMPRE use o formato "TÍTULO<br>" para os títulos das seções

FORMATO DE SAÍDA (HTML BÁSICO COM <br>):
[texto principal do produto começando com o nome do produto de forma natural e fluida, incluindo o nome do produto 2-3 vezes na descrição para SEO, com tags HTML básicas]

<br><br>

<b>SOBRE A MARCA</b><br>
[Seção sobre a marca usando EXCLUSIVAMENTE o contexto da marca fornecido, sem inventar informações adicionais]

<br><br>

<b>CARACTERÍSTICAS DO PRODUTO</b><br>
[Seção detalhada das características técnicas e visuais do produto, baseada na análise da imagem, incluindo o nome do produto quando relevante para SEO]

<br><br>

<b>COMO CUIDAR DO SEU PRODUTO</b><br>
[Instruções específicas de cuidado, limpeza e manutenção baseadas no tipo de material e produto]

<br><br>

<b>PERGUNTAS FREQUENTES</b><br><br>
<ul>
  <li><b>[Pergunta mais relevante 1?]</b><br>[Resposta inteligente baseada no produto.]</li><br>
  <li><b>[Pergunta mais relevante 2?]</b><br>[Resposta inteligente baseada no produto.]</li><br>
  <li><b>[Pergunta mais relevante 3?]</b><br>[Resposta inteligente baseada no produto.]</li><br>
  [Adicione mais perguntas se necessário, entre 3-5 total]
</ul>

<br><br>

<b>Não perca esta oportunidade única!</b><br>
[Chamada final persuasiva com urgência, escassez e benefícios exclusivos. Use linguagem emocional, mencione estoques limitados, crie senso de comunidade e inclua call-to-action claro como "Adquira já", "Garanta agora" ou "Não perca esta chance". Mencione o nome do produto e seus benefícios únicos para motivar a compra imediata.]`,
      guidelines_template: `Crie uma descrição completa e estruturada para este produto com formatação HTML:

TÍTULO: {title}
CONTEXTO DA MARCA: {brandContext}
ANÁLISE DA IMAGEM: {imageAnalysis}

ESTRUTURA OBRIGATÓRIA:
1. Descrição apresentando o  produto com um texto empoderador.
2. SOBRE A MARCA - USAR EXCLUSIVAMENTE o contexto da marca fornecido (não inventar informações)
3. CARACTERÍSTICAS DO PRODUTO - Baseado na análise da imagem
4. COMO CUIDAR DO SEU PRODUTO - Instruções práticas de cuidado
5. PERGUNTAS FREQUENTES - FAQ relevante para o produto
6. CHAMADA FINAL - Call-to-action persuasivo

IMPORTANTE: 
- Use APENAS HTML básico: <b>, <br>, <ul>, <li> para destacar informações importantes
- SEMPRE use <br> para quebrar linhas entre parágrafos
- Inclua o nome do produto naturalmente no início da descrição para melhor SEO
- Comece a descrição com o nome do produto de forma fluida e natural
- USE EXCLUSIVAMENTE o contexto da marca na seção "SOBRE A MARCA" (não invente informações)
- Se não houver contexto da marca, escreva "Informações sobre a marca não disponíveis"
- Use a análise da imagem para as "CARACTERÍSTICAS DO PRODUTO"
- A seção SOBRE A MARCA é OBRIGATÓRIA
- A seção CARACTERÍSTICAS DO PRODUTO é OBRIGATÓRIA  
- A seção COMO CUIDAR DO SEU PRODUTO é OBRIGATÓRIA
- A seção PERGUNTAS FREQUENTES é OBRIGATÓRIA
- SEMPRE usar o título "<b>PERGUNTAS FREQUENTES</b>" para a seção FAQ
- ANALISE o produto e gere as perguntas mais relevantes e inteligentes
- Gerar entre 3-5 perguntas (quantidade ideal baseada no produto)
- SEMPRE usar formato de lista HTML: <ul><li><b>Pergunta?</b><br>Resposta.</li></ul>
- Foque nas dúvidas mais importantes e específicas para este produto
- Seja criativo e pense como um cliente real faria
- A seção CHAMADA FINAL é OBRIGATÓRIA
- SEMPRE incluir senso de exclusividade emocional e urgência

SEO E OTIMIZAÇÃO:
- Inclua o nome do produto naturalmente 2-3 vezes na descrição (não no início)
- Use palavras-chave relevantes do produto de forma natural
- Crie conteúdo único e valioso para o cliente
- Use linguagem persuasiva mas autêntica
- Foque nos benefícios e não apenas nas características

CTA FINAL PERSUASIVO:
- Crie urgência e escassez ("Estoques limitados", "Oferta por tempo limitado")
- Use linguagem emocional e motivacional
- Inclua call-to-action claro ("Adquira já", "Garanta agora", "Não perca")
- Mencione benefícios exclusivos do produto
- Crie senso de comunidade ("Faça parte", "Junte-se aos fãs")
- Use linguagem persuasiva e emocional na chamada final
- SEMPRE separe as seções com <br><br> para melhor organização
- SEMPRE use títulos para as seções para melhor organização
- SEMPRE use o formato "TÍTULO<br>" para os títulos das seções

FORMATO DE SAÍDA (HTML BÁSICO COM <br>):
[Descrição completa em HTML básico usando APENAS tags <b>, <br>, <ul>, <li> seguindo exatamente a estrutura definida com quebras de linha <br>]`,
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 2000
    };
    console.log('🤖 Agente configurado:', agent.name);

    // 4. Verificar chave da OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'Chave da OpenAI não configurada' 
      }, { status: 500 });
    }

    // 5. Buscar dados do produto e análise de imagem
    console.log('🔍 Buscando dados do produto e análise de imagem...');
    let productData = null;
    let imageAnalysis = null;
    
    try {
      // Buscar dados do produto
      const productQuery = `
        SELECT 
          p.*,
          b.name as brand_name,
          b.contexto as brand_context,
          c.name as category_name
        FROM products_vtex p
        LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
        LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
        WHERE p.id_produto_vtex = ?
      `;
      const productResult = await executeQuery(productQuery, [numericProductId]);
      productData = productResult && productResult.length > 0 ? productResult[0] : null;
      
      // Buscar análise de imagem se disponível
      const imageQuery = `
        SELECT contextualizacao 
        FROM analise_imagens 
        WHERE id_produto_vtex = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const imageResult = await executeQuery(imageQuery, [numericProductId]);
      imageAnalysis = imageResult && imageResult.length > 0 ? imageResult[0] : null;
      
      console.log('📦 Dados do produto:', productData ? 'Encontrados' : 'Não encontrados');
      console.log('🖼️ Análise de imagem:', imageAnalysis ? 'Encontrada' : 'Não encontrada');
    } catch (error) {
      console.log('⚠️ Erro ao buscar dados adicionais:', (error as Error).message);
    }

    // 6. Gerar descrição
    console.log('✨ Gerando descrição...');
    const result = await generateDescriptionWithAgent(
      title,
      numericProductId,
      openaiApiKey,
      agent,
      3,
      imageAnalysis,
      productData
    );

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        message: result.error 
      }, { status: 500 });
    }

    console.log('✅ Descrição gerada com sucesso!');
    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('❌ Erro na geração de descrição:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
