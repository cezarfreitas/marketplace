import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

// Função para validar títulos seguindo as regras do marketplace
function validateTitle(title: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Título vazio');
    return { isValid: false, errors };
  }
  
  // Verificar tamanho
  if (title.length > 60) {
    errors.push(`Título muito longo: ${title.length} caracteres (máximo 60)`);
  }
  
  // Verificar hífens
  if (title.includes('-')) {
    errors.push('Título contém hífens (não permitido)');
  }
  
  // Verificar palavras proibidas
  const forbiddenWords = ['Top', 'Promoção', 'Mais Barata', 'Frete Grátis', 'Oferta', 'Liquidação'];
  const hasForbiddenWord = forbiddenWords.some(word => 
    title.toLowerCase().includes(word.toLowerCase())
  );
  if (hasForbiddenWord) {
    errors.push('Título contém palavras promocionais proibidas');
  }
  
  // Verificar se tem palavras cortadas/truncadas
  if (hasTruncatedWords(title)) {
    errors.push('Título contém palavras cortadas ou truncadas');
  }
  
  // Verificar elementos essenciais
  const hasProductType = /camiseta|boné|jaqueta|tênis|moletom|calça|short|blusa/i.test(title);
  const hasAudience = /masculin|feminin|unissex|juvenil|infantil/i.test(title);
  
  if (!hasProductType) {
    errors.push('Título não contém tipo de produto claro');
  }
  if (!hasAudience) {
    errors.push('Título não contém público-alvo');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Função para corrigir problemas comuns nos títulos
function fixTitleIssues(title: string): string {
  let fixedTitle = title;
  
  // Remover hífens
  fixedTitle = fixedTitle.replace(/-/g, ' ');
  
  // Remover palavras proibidas
  const forbiddenWords = ['Top', 'Promoção', 'Mais Barata', 'Frete Grátis', 'Oferta', 'Liquidação'];
  forbiddenWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    fixedTitle = fixedTitle.replace(regex, '');
  });
  
  // Limpar espaços extras
  fixedTitle = fixedTitle.replace(/\s+/g, ' ').trim();
  
  // NÃO truncar - se for muito longo, rejeitar completamente
  if (fixedTitle.length > 60) {
    return ''; // Retorna vazio para forçar nova tentativa
  }
  
  return fixedTitle;
}

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

// Função para verificar se o título tem palavras cortadas
function hasTruncatedWords(title: string): boolean {
  // Verificar se termina com palavra incompleta (sem espaço no final)
  const trimmed = title.trim();
  if (trimmed.length === 0) return false;
  
  // Verificar se a última palavra parece estar cortada
  const words = trimmed.split(' ');
  const lastWord = words[words.length - 1];
  
  // Palavras muito curtas no final podem indicar truncamento
  if (lastWord.length < 3 && words.length > 1) {
    return true;
  }
  
  // Verificar se há reticências ou pontos no final
  if (trimmed.endsWith('...') || trimmed.endsWith('..')) {
    return true;
  }
  
  return false;
}

// Função para verificar se título já existe no banco
async function checkTitleExists(title: string, productId: number): Promise<boolean> {
  try {
    console.log(`🔍 Verificando se título existe: "${title}"`);
    
    // Verificar na tabela marketplace
    const marketplaceQuery = `
      SELECT COUNT(*) as count 
      FROM marketplace 
      WHERE title = ? AND product_id != ?
    `;
    const marketplaceResult = await executeQuery(marketplaceQuery, [title, productId]);
    const marketplaceCount = (marketplaceResult[0] as any).count;
    
    // Verificar também na tabela products_vtex (títulos originais)
    const productsQuery = `
      SELECT COUNT(*) as count 
      FROM products_vtex 
      WHERE title = ? AND id != ?
    `;
    const productsResult = await executeQuery(productsQuery, [title, productId]);
    const productsCount = (productsResult[0] as any).count;
    
    const totalCount = marketplaceCount + productsCount;
    const exists = totalCount > 0;
    
    console.log(`📊 Resultado da verificação: Marketplace=${marketplaceCount}, Products=${productsCount}, Total=${totalCount}, Existe=${exists}`);
    
    return exists;
  } catch (error) {
    console.log('⚠️ Erro ao verificar duplicata de título:', error);
    return false; // Em caso de erro, assumir que não existe para não bloquear
  }
}

// Função para gerar título com agente exclusivo baseado na análise de fotografia e dados VTEX
async function generateTitleWithExclusiveAgent(
  product: any,
  imageAnalysis: any,
  skus: any[],
  specifications: any[],
  productId: number,
  openaiApiKey: string,
  agent: any,
  maxAttempts: number = 10
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    console.log('🎯 Gerando título com agente exclusivo...');
    console.log(`🤖 Usando agente exclusivo: ${agent.name} (ID: ${agent.id})`);
    
    // Gerar elementos criativos aleatórios
    const creativeElements = {
      styles: ['Moderno', 'Clássico', 'Esportivo', 'Casual', 'Urbano', 'Elegante', 'Despojado', 'Vintage', 'Minimalista', 'Retrô', 'Futurista', 'Boêmio', 'Chic', 'Relaxado', 'Dinâmico', 'Arrojado', 'Sofisticado', 'Descontraído', 'Refinado', 'Contemporâneo'],
      qualities: ['Premium', 'Confortável', 'Resistente', 'Leve', 'Macio', 'Durável', 'Versátil', 'Exclusivo', 'Autêntico', 'Sofisticado', 'Prático', 'Elegante', 'Robusto', 'Suave', 'Flexível', 'Luxuoso', 'Superior', 'Ideal', 'Perfeito', 'Essencial'],
      occasions: ['Dia a Dia', 'Trabalho', 'Academia', 'Festa', 'Viagem', 'Casa', 'Escritório', 'Lazer', 'Eventos', 'Fim de Semana', 'Noite', 'Manhã', 'Tarde', 'Encontro', 'Reunião', 'Treino', 'Saída', 'Compromisso'],
      materials: ['Algodão', 'Poliamida', 'Elastano', 'Viscose', 'Modal', 'Linho', 'Jersey', 'Malha', 'Tecido', 'Fibra', 'Microfibra', 'Bambu', 'Orgânico', 'Sustentável'],
      patterns: ['Liso', 'Listrado', 'Estampado', 'Bordado', 'Grafite', 'Degradê', 'Geométrico', 'Floral', 'Abstrato', 'Minimalista', 'Clássico', 'Moderno'],
      emotions: ['Confortável', 'Estiloso', 'Elegante', 'Moderno', 'Clássico', 'Exclusivo', 'Premium', 'Autêntico', 'Sofisticado', 'Chic', 'Refinado', 'Arrojado'],
      benefits: ['Conforto', 'Estilo', 'Qualidade', 'Durabilidade', 'Versatilidade', 'Elegância', 'Praticidade', 'Modernidade', 'Autenticidade', 'Exclusividade']
    };

    const randomStyle = creativeElements.styles[Math.floor(Math.random() * creativeElements.styles.length)];
    const randomQuality = creativeElements.qualities[Math.floor(Math.random() * creativeElements.qualities.length)];
    const randomOccasion = creativeElements.occasions[Math.floor(Math.random() * creativeElements.occasions.length)];
    const randomEmotion = creativeElements.emotions[Math.floor(Math.random() * creativeElements.emotions.length)];
    const randomBenefit = creativeElements.benefits[Math.floor(Math.random() * creativeElements.benefits.length)];
    const randomMaterial = creativeElements.materials[Math.floor(Math.random() * creativeElements.materials.length)];

    const systemPrompt = agent.system_prompt || `Você é um ESPECIALISTA em SEO e marketing para marketplace, focado na criação de títulos PERFEITOS que maximizem a visibilidade e conversão.

📌 ESTRUTURA OBRIGATÓRIA IDEAL PARA MARKETPLACE:
[TIPO DE PRODUTO] + [MARCA (OPCIONAL)] + [MODELO/ESTILO] + [CARACTERÍSTICA PRINCIPAL] + [COR (OPCIONAL)] + [PÚBLICO]

🔑 REGRAS CRÍTICAS (NUNCA QUEBRAR):
1. MÁXIMO 60 caracteres (limite obrigatório do marketplace)
2. SEMPRE incluir: Tipo de Produto + Modelo/Estilo + Característica + Público
3. Ordem importa: termo mais buscado vem primeiro (ex: "Camiseta NFL" e não "NFL Camiseta")
4. NUNCA usar hífens (-) no título
5. SEM palavras promocionais proibidas: "Top", "Promoção", "Mais Barata", "Frete Grátis"
6. SEM repetições desnecessárias de palavras
7. Otimizar para filtros: público e tipo devem aparecer para bater com os filtros da plataforma
8. NUNCA cortar ou truncar palavras - todas as palavras devem estar completas
9. Se não couber em 60 caracteres, use sinônimos mais curtos, não corte palavras
10. Marca e Cor são OPCIONAIS - inclua apenas se for relevante e couber no limite de caracteres

🎯 ELEMENTOS ESSENCIAIS:
- Tipo de Produto: Camiseta, Boné, Jaqueta, Tênis, Moletom, Calça, Short, etc.
- Marca/Licença: Nike, Adidas, NFL, NBA, Ecko, Onbongo, etc. (se oficial, usar "Original/Oficial")
- Modelo/Estilo: Slim Fit, Casual, Estampada, Polo, Streetwear, Canguru, etc.
- Característica Principal: Algodão, Bordado, Manga Longa, Moletom Grosso, etc.
- Cor: sempre em português correto ("Bordô", não "Bordo")
- Público: Masculina, Feminina, Unissex, Juvenil, Infantil

✅ EXEMPLOS DE TÍTULOS PERFEITOS:
- "Camiseta NFL Masculina Estampada Original Oficial"
- "Boné Ecko Aba Curva Preto Snapback Unissex Original"
- "Moletom Canguru Masculino Casual Premium Confortável"
- "Tênis Air Max Masculino Original Esportivo Moderno"
- "Jaqueta Feminina Casual Oficial Elegante"
- "Camiseta Polo Masculina Básica Clássica Premium"
- "Calça Jeans Masculina Reta Original Denim"

🎯 ELEMENTOS CRIATIVOS PARA ESTA TENTATIVA:
- Estilo Foco: ${randomStyle}
- Qualidade Destaque: ${randomQuality}
- Ocasião: ${randomOccasion}
- Emoção: ${randomEmotion}
- Benefício: ${randomBenefit}
- Material: ${randomMaterial}

💡 VOCABULÁRIO CRIATIVO EXPANDIDO:
- Estilos: ${creativeElements.styles.join(', ')}
- Qualidades: ${creativeElements.qualities.join(', ')}
- Ocasiões: ${creativeElements.occasions.join(', ')}
- Materiais: ${creativeElements.materials.join(', ')}
- Padrões: ${creativeElements.patterns.join(', ')}

🚀 TÉCNICAS CRIATIVAS:
- Use sinônimos criativos (Camiseta = Blusa, Top, Camisa)
- Varie a ordem das palavras
- Adicione emoções (Confortável, Estiloso, Elegante)
- Use palavras de ação (Para, Ideal, Perfeito)
- Inclua benefícios (Conforto, Estilo, Qualidade)

FORMATO DE RESPOSTA:
Retorne APENAS o título, sem aspas, sem explicações, sem formatação adicional.`;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Tentativa ${attempt}/${maxAttempts} de geração de título...`);
      
      // Gerar variações criativas para esta tentativa
      const creativeVariations = {
        approaches: [
          'Foque no CONFORTO e QUALIDADE',
          'Destaque o ESTILO e ELEGÂNCIA', 
          'Enfatize a VERSATILIDADE',
          'Destaque a DURABILIDADE',
          'Foque na MODERNIDADE',
          'Enfatize a AUTENTICIDADE'
        ],
        structures: [
          'CATEGORIA + MARCA + GÊNERO + QUALIDADE + COR',
          'CATEGORIA + MARCA + GÊNERO + ESTILO + COR',
          'CATEGORIA + MARCA + GÊNERO + MATERIAL + COR',
          'CATEGORIA + MARCA + GÊNERO + BENEFÍCIO + COR',
          'CATEGORIA + MARCA + GÊNERO + OCASIÃO + COR'
        ],
        emotions: ['Confortável', 'Estiloso', 'Elegante', 'Moderno', 'Clássico', 'Exclusivo', 'Premium', 'Autêntico'],
        actions: ['Para', 'Ideal', 'Perfeito', 'Essencial', 'Indispensável', 'Obrigatório']
      };

      const randomApproach = creativeVariations.approaches[Math.floor(Math.random() * creativeVariations.approaches.length)];
      const randomStructure = creativeVariations.structures[Math.floor(Math.random() * creativeVariations.structures.length)];
      const randomEmotion = creativeVariations.emotions[Math.floor(Math.random() * creativeVariations.emotions.length)];
      const randomAction = creativeVariations.actions[Math.floor(Math.random() * creativeVariations.actions.length)];

      const userPrompt = `Crie um título perfeito para marketplace seguindo a estrutura ideal:

=== ANÁLISE DA FOTOGRAFIA ===
${imageAnalysis ? imageAnalysis.contextualizacao : 'Nenhuma análise de imagem disponível'}

=== DADOS DO PRODUTO ===
Nome Original: ${product.name}
Marca: ${product.brand_name || 'N/A'}
Categoria: ${product.category_name || 'N/A'}
Ref ID: ${product.ref_id || 'N/A'}

=== ESPECIFICAÇÕES TÉCNICAS ===
${specifications.length > 0 ? specifications.map((spec, index) => `
${index + 1}. ${spec.field_name}: ${spec.field_value_ids || 'N/A'} ${spec.field_group_name ? `(Grupo: ${spec.field_group_name})` : ''}
`).join('') : 'Nenhuma especificação encontrada'}

=== DADOS DOS SKUs ===
${skus.length > 0 ? skus.map((sku, index) => `
SKU ${index + 1}: ${sku.sku_name || 'N/A'} - ${sku.manufacturer_code || 'N/A'}
`).join('') : 'Nenhum SKU encontrado'}

=== INSTRUÇÕES CRÍTICAS ===
- Siga EXATAMENTE a estrutura: [TIPO DE PRODUTO] + [MARCA (OPCIONAL)] + [MODELO/ESTILO] + [CARACTERÍSTICA] + [COR (OPCIONAL)] + [PÚBLICO]
- Máximo 60 caracteres
- Sem hífens (-)
- Marca e Cor são OPCIONAIS - inclua apenas se for relevante e couber no limite
- Se for oficial/licenciado, incluir "Original" ou "Oficial"
- Evite palavras promocionais proibidas
- Otimize para filtros da plataforma
- NUNCA cortar ou truncar palavras - todas devem estar completas
- Se não couber em 60 chars, use sinônimos mais curtos, não corte palavras
- Tentativa ${attempt} de ${maxAttempts}

Responda APENAS com o título otimizado, sem explicações ou formatação adicional.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: agent.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 100,
          temperature: Math.min(parseFloat(agent.temperature) + (attempt * 0.15) + 0.2, 0.9),
          stream: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`❌ Erro na API OpenAI (tentativa ${attempt}):`, response.status, errorData);
        if (attempt === maxAttempts) {
          throw new Error(`Erro na API OpenAI: ${response.status}`);
        }
        continue;
      }

      const responseData = await response.json();
      const content = responseData.choices[0]?.message?.content;
      
      if (!content) {
        console.log(`❌ Resposta vazia na tentativa ${attempt}`);
        if (attempt === maxAttempts) {
          throw new Error('Resposta vazia da OpenAI');
        }
        continue;
      }

      let generatedTitle = content.trim();
      
      // Remover aspas se houver
      generatedTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();
      
      console.log(`📝 Título gerado (tentativa ${attempt}): "${generatedTitle}" (${generatedTitle.length} caracteres)`);
      
      // VALIDAÇÃO: Verificar se o título segue as regras do marketplace
      const validation = validateTitle(generatedTitle);
      if (!validation.isValid) {
        console.log(`❌ Título inválido (${validation.errors.join(', ')}), tentando novamente...`);
        if (attempt === maxAttempts) {
          // Na última tentativa, tentar corrigir automaticamente
          generatedTitle = fixTitleIssues(generatedTitle);
          console.log(`⚠️ Título corrigido na última tentativa: "${generatedTitle}"`);
        } else {
          continue; // Tentar novamente
        }
      }
      
      // VALIDAÇÃO: Verificar se não está vazio
      if (generatedTitle.length === 0) {
        console.log(`❌ Título vazio na tentativa ${attempt}, tentando novamente...`);
        continue;
      }
      
      // VALIDAÇÃO: Verificar se contém informações básicas
      const hasBasicInfo = (
        generatedTitle.toLowerCase().includes((product.brand_name || '').toLowerCase()) ||
        generatedTitle.toLowerCase().includes((product.category_name || '').toLowerCase()) ||
        generatedTitle.toLowerCase().includes('camiseta') ||
        generatedTitle.toLowerCase().includes('moletom') ||
        generatedTitle.toLowerCase().includes('calça') ||
        generatedTitle.toLowerCase().includes('blusa')
      );
      
      if (!hasBasicInfo) {
        console.log(`❌ Título não contém informações básicas na tentativa ${attempt}, tentando novamente...`);
        continue;
      }
      
      // VALIDAÇÃO: Verificar unicidade no banco
      const exists = await checkTitleExists(generatedTitle, productId);
      if (exists) {
        console.log(`❌ Título já existe na tentativa ${attempt}, tentando novamente...`);
        if (attempt === maxAttempts) {
          // Na última tentativa, adicionar sufixo único
          const uniqueSuffix = ` ${Date.now().toString().slice(-4)}`;
          const finalTitle = generatedTitle.length + uniqueSuffix.length <= 60 
            ? generatedTitle + uniqueSuffix
            : generatedTitle.substring(0, 60 - uniqueSuffix.length) + uniqueSuffix;
          console.log(`⚠️ Título com sufixo único na última tentativa: "${finalTitle}"`);
          return { success: true, data: finalTitle };
        }
        continue;
      }
      
      console.log(`✅ Título válido gerado com sucesso na tentativa ${attempt}!`);
      return { success: true, data: generatedTitle };
    }
    
    // Se chegou aqui, todas as tentativas falharam
    throw new Error(`Não foi possível gerar título válido após ${maxAttempts} tentativas`);

  } catch (error: any) {
    console.error('❌ Erro ao gerar título com agente exclusivo:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para salvar título na tabela dedicada de títulos
async function saveTitleToTitlesTable(
  productId: number,
  title: string,
  originalTitle: string,
  agentId: number,
  openaiModel: string,
  tokensUsed: number,
  tokensPrompt: number,
  tokensCompletion: number,
  cost: number,
  requestId: string,
  responseTime: number,
  maxTokens: number,
  temperature: number,
  generationAttempts: number,
  isUnique: boolean,
  validationPassed: boolean
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const insertQuery = `
      INSERT INTO titles (
        product_id, title, original_title, agent_id, openai_model,
        openai_tokens_used, openai_tokens_prompt, openai_tokens_completion,
        openai_cost, openai_request_id, openai_response_time_ms,
        openai_max_tokens, openai_temperature, generation_attempts,
        is_unique, validation_passed, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'validated')
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        original_title = VALUES(original_title),
        agent_id = VALUES(agent_id),
        openai_model = VALUES(openai_model),
        openai_tokens_used = openai_tokens_used + VALUES(openai_tokens_used),
        openai_tokens_prompt = openai_tokens_prompt + VALUES(openai_tokens_prompt),
        openai_tokens_completion = openai_tokens_completion + VALUES(openai_tokens_completion),
        openai_cost = openai_cost + VALUES(openai_cost),
        openai_request_id = VALUES(openai_request_id),
        openai_response_time_ms = VALUES(openai_response_time_ms),
        openai_max_tokens = VALUES(openai_max_tokens),
        openai_temperature = VALUES(openai_temperature),
        generation_attempts = VALUES(generation_attempts),
        is_unique = VALUES(is_unique),
        validation_passed = VALUES(validation_passed),
        status = 'validated',
        updated_at = NOW()
    `;

    const result = await executeQuery(insertQuery, [
      productId,
      title,
      originalTitle,
      agentId,
      openaiModel,
      tokensUsed,
      tokensPrompt,
      tokensCompletion,
      cost,
      requestId,
      responseTime,
      maxTokens,
      temperature,
      generationAttempts,
      isUnique,
      validationPassed
    ]);

    console.log('✅ Título salvo na tabela titles para produto ID:', productId);

    return {
      success: true,
      data: {
        id: (result as any).insertId,
        productId,
        title
      }
    };

  } catch (error: any) {
    console.error('❌ Erro ao salvar título:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🎯 Iniciando geração de título...');
    
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

    console.log('🎯 Gerando título para produto ID:', productId);

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

    // 3. Buscar especificações do produto
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
      
      // Buscar da tabela analise_imagens (tabela correta)
      const analysisQuery = `
        SELECT 
          ai.*,
          ai.agent_name,
          ai.contextualizacao as contextual_analysis
        FROM analise_imagens ai
        WHERE ai.id_produto = ?
        ORDER BY ai.created_at DESC
        LIMIT 1
      `;
      
      const analyses = await executeQuery(analysisQuery, [numericProductId]);
      console.log('📊 Análises encontradas na tabela analise_imagens:', analyses?.length || 0);
      
      if (analyses && analyses.length > 0) {
        imageAnalysis = analyses[0];
        console.log('🖼️ Análise de imagem encontrada');
      } else {
        console.log('🖼️ Nenhuma análise de imagem encontrada');
        return NextResponse.json({
          success: false,
          message: 'Nenhuma análise de imagem encontrada. Execute a análise de imagem primeiro.'
        }, { status: 400 });
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar análise de imagens:', error);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar análise de imagens'
      }, { status: 500 });
    }

    // 5. Verificar se já existe título (se não for regeneração forçada)
    if (!forceRegenerate) {
      console.log('🔍 Verificando se já existe título...');
      try {
        const existingQuery = `SELECT title FROM titles WHERE product_id = ? AND status = 'validated'`;
        const existing = await executeQuery(existingQuery, [numericProductId]);
        console.log('📊 Títulos existentes:', existing?.length || 0);
        
        if (existing && existing.length > 0) {
          console.log('✅ Título já existe, retornando...');
          return NextResponse.json({
            success: true,
            data: {
              title: existing[0].title,
              message: 'Título já existe'
            }
          });
        }
      } catch (error) {
        console.log('⚠️ Erro ao verificar títulos existentes:', error);
        // Continuar com a geração mesmo se houver erro na verificação
      }
    } else {
      console.log('🔄 Regeneração forçada - removendo títulos existentes...');
      try {
        // Remover títulos existentes para forçar nova geração
        const deleteQuery = `DELETE FROM titles WHERE product_id = ?`;
        await executeQuery(deleteQuery, [numericProductId]);
        console.log('🗑️ Títulos existentes removidos para regeneração');
      } catch (error) {
        console.log('⚠️ Erro ao remover títulos existentes:', error);
        // Continuar mesmo com erro
      }
    }

    // 6. Verificar se a chave da OpenAI está configurada
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      console.log('⚠️ Chave da OpenAI não configurada no .env');
      return NextResponse.json({
        success: false,
        message: 'Chave da API OpenAI não configurada. Configure OPENAI_API_KEY no arquivo .env.'
      }, { status: 500 });
    }

    // 6. Buscar agente exclusivo para títulos
    console.log('🔍 Buscando agente exclusivo para títulos...');
    let agent;
    try {
      const agentQuery = `
        SELECT id, name, system_prompt, model, max_tokens, temperature
        FROM agents 
        WHERE function_type = 'title_generation' AND is_active = 1
        LIMIT 1
      `;
      
      const agentResult = await executeQuery(agentQuery, []);
      agent = agentResult && agentResult.length > 0 ? agentResult[0] : null;
      
      if (!agent) {
        console.log('❌ Agente exclusivo para títulos não encontrado');
        return NextResponse.json({
          success: false,
          message: 'Agente exclusivo para títulos não encontrado. Configure um agente com function_type = "title_generation"'
        }, { status: 404 });
      }
      
      console.log(`🤖 Agente encontrado: ${agent.name} (ID: ${agent.id})`);
    } catch (error) {
      console.log('❌ Erro ao buscar agente:', error);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar agente para geração de títulos'
      }, { status: 500 });
    }

    // 7. Gerar título com agente exclusivo
    console.log('🎯 Gerando título com agente exclusivo...');
    const titleStartTime = Date.now();
    const titleResponse = await generateTitleWithExclusiveAgent(
      product, 
      imageAnalysis, 
      skus, 
      specifications, 
      numericProductId, 
      openaiApiKey,
      agent
    );
    const titleGenerationTime = Date.now() - titleStartTime;
    console.log(`🎯 Título gerado (${titleGenerationTime}ms):`, titleResponse.success ? 'Sucesso' : 'Erro');
    
    if (!titleResponse.success) {
      console.log('❌ Erro na geração do título:', titleResponse.error);
      return NextResponse.json({
        success: false,
        message: titleResponse.error || 'Erro ao gerar título com agente exclusivo'
      }, { status: 500 });
    }

    const generatedTitle = titleResponse.data!;
    console.log('✅ Título gerado com agente exclusivo:', generatedTitle);

    // 8. Salvar título no banco de dados
    console.log('💾 Salvando título no banco de dados...');
    const saveResult = await saveTitleToTitlesTable(
      numericProductId,
      generatedTitle,
      product.name, // Título original
      agent.id, // ID do agente
      agent.model || 'gpt-4o-mini',
      0, // Tokens (será calculado se necessário)
      0, // Tokens prompt
      0, // Tokens completion
      0, // Custo (será calculado se necessário)
      '', // Request ID
      titleGenerationTime,
      parseInt(agent.max_tokens) || 100,
      parseFloat(agent.temperature) || 0.3,
      1, // Tentativas de geração
      true, // É único
      true // Validação passou
    );

    if (!saveResult.success) {
      console.log('❌ Erro ao salvar título:', saveResult.error);
      return NextResponse.json({
        success: false,
        message: 'Erro ao salvar título no banco de dados'
      }, { status: 500 });
    }

    console.log('✅ Título gerado e salvo com sucesso!');
    return NextResponse.json({
      success: true,
      data: {
        title: generatedTitle,
        productId: numericProductId,
        generationTime: titleGenerationTime
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar título:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao gerar título',
      error: error.message
    }, { status: 500 });
  }
}
