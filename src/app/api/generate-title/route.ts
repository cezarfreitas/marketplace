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
  
  // ÚNICA VALIDAÇÃO CRÍTICA: Verificar tamanho máximo de 60 caracteres
  if (title.length > 60) {
    errors.push(`Título muito longo: ${title.length} caracteres (máximo 60)`);
  }
  
  // Todas as outras validações foram removidas para dar mais flexibilidade
  // A unicidade será verificada na tabela titles
  
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

// Função para processar os 5 títulos gerados pela IA
function parseGeneratedTitles(content: string): string[] {
  const titles: string[] = [];
  
  // Dividir por linhas e processar cada uma
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  for (const line of lines) {
    // Procurar por padrões como "1. Título", "2. Título", etc.
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) {
      let title = match[1].trim();
      // Remover aspas se houver
      title = title.replace(/^["']|["']$/g, '').trim();
      if (title.length > 0) {
        titles.push(title);
      }
    }
  }
  
  // Se não encontrou títulos numerados, tentar dividir por linhas simples
  if (titles.length === 0) {
    const simpleTitles = lines.filter(line => 
      line.length > 10 && 
      line.length <= 60 && 
      !line.includes('Exemplo') && 
      !line.includes('FORMATO')
    );
    titles.push(...simpleTitles);
  }
  
  console.log(`📋 Processados ${titles.length} títulos:`, titles);
  return titles;
}

// Função para verificar se título já existe no banco
async function checkTitleExists(title: string, productId: number, isRegeneration: boolean = false): Promise<boolean> {
  try {
    console.log(`🔍 Verificando se título existe: "${title}" (Regeneração: ${isRegeneration})`);
    
    // Para regeneração, verificar se existe para outros produtos
    // Para título novo, verificar se existe para qualquer produto
    const titlesQuery = isRegeneration 
      ? `SELECT COUNT(*) as count FROM titles WHERE title = ? AND id_product_vtex != ?`
      : `SELECT COUNT(*) as count FROM titles WHERE title = ?`;
      
    const titlesResult = await executeQuery(titlesQuery, isRegeneration ? [title, productId] : [title]);
    const titlesCount = (titlesResult[0] as any).count;
    
    const exists = titlesCount > 0;
    
    console.log(`📊 Resultado da verificação: Titles=${titlesCount}, Existe=${exists} (Regeneração: ${isRegeneration})`);
    
    return exists;
  } catch (error) {
    console.log('⚠️ Erro ao verificar duplicata de título:', error);
    return false; // Em caso de erro, assumir que não existe para não bloquear
  }
}

// Função para detectar nomes próprios no produto (como "Boyd ST", "Air Max", etc.)
function detectProperNames(productName: string): string[] {
  const properNames: string[] = [];
  
  // Padrões comuns de nomes próprios
  const patterns = [
    // Nomes com ST, LT, PRO, MAX, etc.
    /\b[A-Z][a-z]+ [A-Z]{2,4}\b/g, // "Boyd ST", "Air Max", "Pro LT"
    // Nomes com números
    /\b[A-Z][a-z]+ \d+\b/g, // "Air Max 90", "Jordan 1"
    // Nomes compostos com hífen
    /\b[A-Z][a-z]+-[A-Z][a-z]+\b/g, // "Super-Star", "Ultra-Boost"
    // Nomes com apostrofe
    /\b[A-Z][a-z]+'[A-Z][a-z]+\b/g, // "Men's", "Women's"
    // Nomes com ponto
    /\b[A-Z][a-z]+\.[A-Z]{2,4}\b/g, // "Dr. Martens"
    // Nomes com & (e comercial)
    /\b[A-Z][a-z]+ & [A-Z][a-z]+\b/g, // "Tom & Jerry"
  ];
  
  // Aplicar cada padrão
  patterns.forEach(pattern => {
    const matches = productName.match(pattern);
    if (matches) {
      properNames.push(...matches);
    }
  });
  
  // Remover duplicatas e filtrar nomes muito genéricos
  const uniqueNames = Array.from(new Set(properNames)).filter(name => {
    const lowerName = name.toLowerCase();
    // Filtrar palavras muito genéricas
    const genericWords = ['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by'];
    return !genericWords.some(word => lowerName.includes(word)) && name.length > 2;
  });
  
  console.log(`🔍 Nomes próprios detectados em "${productName}":`, uniqueNames);
  return uniqueNames;
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
  maxAttempts: number = 10,
  isRegeneration: boolean = false
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    console.log('🎯 Gerando título com agente exclusivo...');
    console.log(`🤖 Usando agente exclusivo: ${agent.name} (ID: ${agent.id})`);
    
    // Detectar nomes próprios no produto
    const properNames = detectProperNames(product.name);
    console.log(`🏷️ Nomes próprios detectados: ${properNames.length > 0 ? properNames.join(', ') : 'Nenhum'}`);
    
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

    const systemPrompt = agent.system_prompt || `Você é um ESPECIALISTA em otimização de títulos para marketplace de moda.

🎯 OBJETIVO: Criar títulos que MAXIMIZEM vendas preservando os elementos-chave do produto.

⚠️ REGRAS ABSOLUTAS:
1. **MÁXIMO 60 caracteres** (limite absoluto - será rejeitado se ultrapassar)
2. **NUNCA corte palavras** - use sinônimos curtos se necessário
3. **SEM hífens (-)** no título
4. **SEM promoções** - não use "Top", "Promoção", "Frete Grátis", "Oferta"

🔑 REGRAS DE PRIORIZAÇÃO (ORDEM DE IMPORTÂNCIA):

1️⃣ **PRESERVAR NOME ORIGINAL**: Use APENAS elementos do nome original + análise de imagem
   - NÃO invente características não confirmadas
   - NÃO adicione termos genéricos como "Casual", "Algodão" sem confirmação

2️⃣ **TIPO COMPLETO**: Mantenha o tipo completo do produto
   - ✅ "Camisa Polo" (não só "Polo")
   - ✅ "Camiseta Regata" (não só "Regata")
   - ✅ "Bermuda Moletom" (não só "Bermuda")

3️⃣ **TIMES E JOGADORES**: Se houver, coloque logo após o tipo
   - ✅ "Camiseta Flamengo Masculina Preta"
   - ✅ "Camisa Polo Messi Argentina Azul"

4️⃣ **MARCA**: Se for conhecida (Nike, Adidas, Ecko, etc.), destaque após tipo/time
   - ✅ "Camisa Polo Ecko Masculina Vermelha"

5️⃣ **CARACTERÍSTICAS TÉCNICAS**: Tecidos, modelos (Piquet, Dry Fit, etc.)
   - ✅ "Camisa Polo Ecko Masculina Piquet Vermelha"

6️⃣ **PÚBLICO**: Masculina, Feminina, Infantil, Unissex

7️⃣ **COR**: Se couber no limite de 60 caracteres

📌 ESTRUTURA IDEAL:
[TIPO COMPLETO] + [TIME/JOGADOR] + [MARCA] + [CARACTERÍSTICA TÉCNICA] + [PÚBLICO] + [COR]

✅ EXEMPLOS PERFEITOS:
- "Camisa Polo Ecko Masculina Vermelha Piquet" (48 chars) ✓
- "Camiseta Flamengo Masculina Preta Oficial" (42 chars) ✓
- "Bermuda Moletom Masculina Preta Confortável" (44 chars) ✓
- "Camiseta Regata Masculina Branca Dry Fit" (41 chars) ✓

❌ EXEMPLOS ERRADOS:
- "Polo Masculina Ecko Vermelha Casual Algodão" (inventou "Casual" e "Algodão")
- "Camiseta Preta Masculina" (perdeu marca e características importantes)

FORMATO DE RESPOSTA:
Retorne APENAS o título, sem aspas, sem explicações.`;

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

      const userPrompt = `Gere 5 títulos otimizados para este produto:

📦 DADOS DO PRODUTO:
Nome Original: ${product.name}
Marca: ${product.brand_name || 'Não especificada'}
Categoria: ${product.category_name || 'Não especificada'}

📸 ANÁLISE DA IMAGEM:
${imageAnalysis ? imageAnalysis.contextualizacao : 'Análise não disponível'}

🎯 INSTRUÇÕES CRÍTICAS:

1. **ANALISE o "Nome Original"** e identifique:
   - Tipo COMPLETO do produto (ex: "Camisa Polo", não só "Polo")
   - TIME ou JOGADOR (se houver)
   - MARCA (se for conhecida: Nike, Adidas, Ecko, Puma, etc.)
   - CARACTERÍSTICAS TÉCNICAS (Piquet, Dry Fit, Moletom, etc.)
   - COR principal

2. **USE APENAS** elementos confirmados no nome original ou análise
   - ❌ NÃO adicione "Casual", "Algodão", "Básica" sem confirmação
   - ❌ NÃO remova partes importantes do tipo ("Camisa Polo" → "Polo")

3. **PRIORIZE nesta ordem**:
   - Tipo completo → Time/Jogador → Marca → Característica Técnica → Público → Cor

4. **EXEMPLO PRÁTICO**:
   - Nome: "Camisa Polo Ecko Piquet Vermelha"
   - ✅ "Camisa Polo Ecko Masculina Vermelha Piquet" (48 chars)
   - ❌ "Polo Masculina Ecko Vermelha Casual" (removeu "Camisa", inventou "Casual")

5. Máximo 60 caracteres por título
6. Gere EXATAMENTE 5 variações diferentes

FORMATO DE RESPOSTA:
1. [título 1]
2. [título 2]
3. [título 3]
4. [título 4]
5. [título 5]`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: agent.model || 'gpt-4.1-mini',
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

      console.log(`📝 Conteúdo gerado (tentativa ${attempt}):`, content);

      // Processar os 5 títulos gerados
      const titles = parseGeneratedTitles(content);
      if (titles.length === 0) {
        console.log(`❌ Nenhum título válido encontrado na tentativa ${attempt}, tentando novamente...`);
        continue;
      }

      console.log(`📋 ${titles.length} títulos processados na tentativa ${attempt}`);

      // Tentar cada título até encontrar um válido e único
      for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        console.log(`🔍 Testando título ${i + 1}/${titles.length}: "${title}" (${title.length} caracteres)`);

        // VALIDAÇÃO: Verificar se o título segue as regras do marketplace
        const validation = validateTitle(title);
        if (!validation.isValid) {
          console.log(`❌ Título ${i + 1} inválido (${validation.errors.join(', ')})`);
          continue;
        }
        
        // VALIDAÇÃO: Verificar unicidade no banco
        const exists = await checkTitleExists(title, productId, isRegeneration);
        if (exists) {
          console.log(`❌ Título ${i + 1} já existe no banco`);
          continue;
        }

        // Se chegou até aqui, o título é válido e único
        console.log(`✅ Título ${i + 1} válido e único encontrado: "${title}"`);
        return {
          success: true,
          data: title
        };
      }

      console.log(`❌ Nenhum dos ${titles.length} títulos foi válido na tentativa ${attempt}, tentando novamente...`);
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

// Função para salvar título na tabela titles
async function saveTitleToTitlesTable(
  productId: number,
  title: string,
  originalTitle: string,
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
        id_product_vtex, title, original_title, openai_model,
        openai_tokens_used, openai_tokens_prompt, openai_tokens_completion,
        openai_cost, openai_request_id, openai_response_time_ms,
        openai_max_tokens, openai_temperature, generation_attempts,
        is_unique, validation_passed, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'validated')
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        original_title = VALUES(original_title),
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

    
    let body;
    try {
      body = await request.json();
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


    // 1. Buscar dados completos do produto
    let products;
    try {
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

      products = await executeQuery(productQuery, [numericProductId]);
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
          s.name as sku_name
        FROM skus_vtex s
        WHERE s.id_produto_vtex = ?
      `;
      
      skus = await executeQuery(skuQuery, [numericProductId]);
      console.log('📊 SKUs encontrados:', skus?.length || 0);
    } catch (error) {
      console.log('⚠️ Erro ao buscar SKUs:', error);
      skus = [];
    }

    // 3. Especificações não disponíveis (tabela não existe)
    console.log('⚠️ Especificações não disponíveis - tabela product_specifications não existe');
    const specifications: any[] = [];

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
        WHERE ai.id_produto_vtex = ?
        ORDER BY ai.created_at DESC
        LIMIT 1
      `;
      
      const analyses = await executeQuery(analysisQuery, [numericProductId]);
      
      if (analyses && analyses.length > 0) {
        imageAnalysis = analyses[0];
      } else {
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
        const existingQuery = `SELECT title FROM titles WHERE id_product_vtex = ? AND status = 'validated'`;
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
        const deleteQuery = `DELETE FROM titles WHERE id_product_vtex = ?`;
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

    // 6. Configurar agente hardcoded para títulos
    console.log('🤖 Configurando agente hardcoded para títulos...');
    const agent = {
      id: 1,
      name: 'Agente de Geração de Títulos',
      system_prompt: `Você é um especialista em otimização de títulos para marketplace de moda.

🎯 OBJETIVO: Criar títulos que preservem os elementos-chave do produto original.

⚠️ REGRAS ABSOLUTAS:
1. MÁXIMO 60 caracteres (limite absoluto)
2. NUNCA corte palavras - use sinônimos curtos
3. SEM hífens (-)
4. SEM promoções ("Top", "Frete Grátis", etc.)
5. Gerar EXATAMENTE 5 títulos diferentes

🔑 PRIORIZAÇÃO (ordem de importância):
1. **TIPO COMPLETO**: "Camisa Polo" (não só "Polo"), "Camiseta Regata" (não só "Regata")
2. **TIMES/JOGADORES**: Se houver, logo após o tipo
3. **MARCA**: Se for conhecida (Nike, Adidas, Ecko, Puma)
4. **CARACTERÍSTICAS TÉCNICAS**: Piquet, Dry Fit, Moletom, etc.
5. **PÚBLICO**: Masculina, Feminina, Infantil
6. **COR**: Se couber

⚠️ IMPORTANTE:
- USE APENAS informações do nome original + análise de imagem
- NÃO invente características ("Casual", "Algodão" sem confirmação)
- NÃO remova partes importantes do tipo

📌 ESTRUTURA:
[TIPO COMPLETO] + [TIME/JOGADOR] + [MARCA] + [TÉCNICA] + [PÚBLICO] + [COR]

✅ EXEMPLOS CORRETOS:
- "Camisa Polo Ecko Masculina Vermelha Piquet" (48 chars) ✓
- "Camiseta Flamengo Masculina Preta Oficial" (42 chars) ✓
- "Bermuda Moletom Masculina Preta Confortável" (44 chars) ✓

❌ ERRADO:
- "Polo Masculina Ecko Vermelha Casual" (removeu "Camisa", inventou "Casual")

FORMATO:
Retorne EXATAMENTE 5 títulos numerados, sem explicações.`,
      model: 'gpt-4.1-mini',
      max_tokens: 100,
      temperature: 0.3
    };
    
    console.log(`🤖 Agente hardcoded configurado: ${agent.name}`);

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
      agent,
      10, // maxAttempts
      forceRegenerate // isRegeneration
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
      agent.model || 'gpt-4o-mini',
      0, // Tokens (será calculado se necessário)
      0, // Tokens prompt
      0, // Tokens completion
      0, // Custo (será calculado se necessário)
      '', // Request ID
      titleGenerationTime,
      (agent.max_tokens as number) || 100,
      (agent.temperature as number) || 0.3,
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
