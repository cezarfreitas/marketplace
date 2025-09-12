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
      
      // Buscar agente se não fornecido
      let currentAgent = agent;
      if (!currentAgent) {
        const agentQuery = `
          SELECT * FROM agents 
          WHERE function_type = 'product_description' 
          AND is_active = 1 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        const agents = await executeQuery(agentQuery);
        if (agents.length === 0) {
          return { success: false, error: 'Agente para geração de descrições não encontrado' };
        }
        currentAgent = agents[0];
      }

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
          .replace('{productName}', productData?.name || 'N/A')
          .replace('{brandName}', productData?.brand_name || 'N/A')
          .replace('{categoryName}', productData?.category_name || 'N/A');
      } else {
        userPrompt = `Crie uma descrição estruturada seguindo EXATAMENTE a estrutura definida:

TÍTULO DO PRODUTO: ${title}

ANÁLISE DA IMAGEM: ${imageAnalysis ? imageAnalysis.contextualizacao || imageAnalysis : 'Nenhuma análise de imagem disponível'}

DADOS ADICIONAIS DO PRODUTO:
- Nome Original: ${productData?.name || 'N/A'}
- Marca: ${productData?.brand_name || 'N/A'}
- Categoria: ${productData?.category_name || 'N/A'}

Use PRINCIPALMENTE a análise da imagem para criar uma descrição completa e persuasiva seguindo a estrutura:
1. Apresentação (baseada na análise visual)
2. Características (observadas na imagem)
3. Benefícios (baseados no que se vê)
4. Como cuidar do produto (específico para o material/tipo)
5. FAQ (relevante para este produto específico)
6. Chamada para compra (baseada nas características)

IMPORTANTE:
- Use a análise da imagem como base principal
- NÃO invente características não observadas
- Seja específico sobre o que se vê na foto
- Crie uma descrição pronta para aplicação direta`;
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

      const content = data.choices[0]?.message?.content;
      if (!content) {
        console.error(`❌ Resposta vazia da OpenAI (tentativa ${attempt})`);
        if (attempt === maxAttempts) {
          return { success: false, error: 'Resposta vazia da OpenAI' };
        }
        continue;
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
          product_id, description,
          openai_model, openai_tokens_used, openai_tokens_prompt, openai_tokens_completion,
          openai_temperature, openai_max_tokens, openai_response_time_ms, openai_cost,
          openai_request_id, agent_id, agent_name, generation_duration_ms, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        currentAgent.id,
        currentAgent.name,
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
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          title VARCHAR(500) NOT NULL COMMENT 'Título gerado para o produto',
          description TEXT NOT NULL COMMENT 'Descrição principal do produto',
          faq TEXT COMMENT 'Perguntas e respostas frequentes em formato JSON',
          openai_model VARCHAR(100) COMMENT 'Modelo OpenAI utilizado',
          openai_tokens_used INT COMMENT 'Total de tokens utilizados',
          openai_tokens_prompt INT COMMENT 'Tokens usados no prompt',
          openai_tokens_completion INT COMMENT 'Tokens usados na resposta',
          openai_temperature DECIMAL(3,2) COMMENT 'Temperatura do modelo',
          openai_max_tokens INT COMMENT 'Máximo de tokens configurado',
          openai_response_time_ms INT COMMENT 'Tempo de resposta da OpenAI em ms',
          openai_cost DECIMAL(10,6) COMMENT 'Custo da requisição em USD',
          openai_request_id VARCHAR(255) COMMENT 'ID da requisição OpenAI',
          agent_id INT COMMENT 'ID do agente utilizado',
          agent_name VARCHAR(255) COMMENT 'Nome do agente',
          generation_duration_ms INT COMMENT 'Duração total da geração em ms',
          status VARCHAR(50) DEFAULT 'generated' COMMENT 'Status da descrição: generated, validated, error',
          error_message TEXT COMMENT 'Mensagem de erro se houver',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_product_id (product_id),
          INDEX idx_status (status),
          INDEX idx_agent_id (agent_id),
          INDEX idx_created_at (created_at),
          INDEX idx_openai_request_id (openai_request_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Descrições de produtos geradas por IA'
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
      WHERE product_id = ? AND status = 'validated'
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
      WHERE product_id = ? AND status = 'generated'
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
          const deleteQuery = `DELETE FROM descriptions WHERE product_id = ?`;
          await executeQuery(deleteQuery, [numericProductId]);
          console.log('🗑️ Descrições existentes removidas para regeneração');
        } catch (error) {
          console.warn('⚠️ Erro ao remover descrições existentes:', error);
        }
      }
    }

    // 3. Buscar agente para descrições
    console.log('🤖 Buscando agente para descrições...');
    const agentQuery = `
      SELECT * FROM agents 
      WHERE function_type = 'product_description' 
      AND is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const agents = await executeQuery(agentQuery);
    
    if (agents.length === 0) {
      console.log('🤖 Agente não encontrado, criando agente padrão...');
      
      const createAgentSQL = `
        INSERT INTO agents (
          name, function_type, system_prompt, guidelines_template, 
          model, temperature, max_tokens, is_active, created_at
        ) VALUES (
          'Descrição de Produto',
          'product_description',
          'Você é um especialista em marketing e copywriting para e-commerce, focado na criação de descrições persuasivas e informativas para produtos.

MISSÃO: Criar uma descrição completa e atrativa do produto, seguida de um FAQ relevante.

ESTRUTURA OBRIGATÓRIA:
1. DESCRIÇÃO PRINCIPAL (2-3 parágrafos)
   - Apresentar o produto de forma atrativa
   - Destacar benefícios e características principais
   - Usar linguagem persuasiva e profissional
   - Incluir call-to-action sutil

2. FAQ (3-5 perguntas e respostas)
   - Perguntas que clientes realmente fazem
   - Respostas claras e úteis
   - Formato: "P: Pergunta" / "R: Resposta"

REGRAS CRÍTICAS:
- Use apenas o título fornecido como base
- Seja criativo mas mantenha credibilidade
- Linguagem clara e acessível
- Foque nos benefícios para o cliente
- FAQ deve ser prático e útil
- Máximo 800 palavras no total

FORMATO DE SAÍDA:
DESCRIÇÃO:
[Descrição principal do produto]

FAQ:
P: [Pergunta 1]
R: [Resposta 1]

P: [Pergunta 2]
R: [Resposta 2]

P: [Pergunta 3]
R: [Resposta 3]',
          'Crie uma descrição completa e FAQ para este produto:

TÍTULO: {title}

Gere uma descrição persuasiva e um FAQ útil baseado apenas no título fornecido.',
          'gpt-4o-mini',
          0.7,
          2000,
          1,
          NOW()
        )
      `;
      
      await executeQuery(createAgentSQL);
      console.log('✅ Agente padrão criado com sucesso!');
      
      // Buscar o agente recém-criado
      const newAgents = await executeQuery(agentQuery);
      if (newAgents.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Erro ao criar agente padrão' 
        }, { status: 500 });
      }
      agents.push(newAgents[0]);
    }

    const agent = agents[0];
    console.log('🤖 Agente encontrado:', agent.name);

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
          c.name as category_name
        FROM products_vtex p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories_vtex c ON p.category_id = c.vtex_id
        WHERE p.id = ?
      `;
      const productResult = await executeQuery(productQuery, [numericProductId]);
      productData = productResult && productResult.length > 0 ? productResult[0] : null;
      
      // Buscar análise de imagem se disponível
      const imageQuery = `
        SELECT contextualizacao 
        FROM image_analysis 
        WHERE product_id = ? 
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
