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


// Função para gerar metadados do produto (clothing_type, sleeve_type, gender, color, modelo)
async function generateProductMetadata(
  product: any,
  imageAnalysis: any,
  skus: any[],
  specifications: any[],
  agent: any,
  title: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('📊 Gerando metadados do produto...');
    
    const systemPrompt = `Você é um especialista em classificação de produtos de moda. Sua tarefa é analisar o produto e gerar metadados específicos baseados no título, análise da fotografia e dados do produto.

REGRAS IMPORTANTES:
1. Analise o título fornecido
2. Use a análise da fotografia para confirmar características visuais
3. Use dados reais do produto VTEX
4. Seja específico e preciso nas classificações
5. Use apenas valores válidos para cada campo

FORMATO DE RESPOSTA (JSON):
{
  "clothing_type": "Tipo de roupa (ex: Camiseta, Camiseta Polo, Moletom, Calça, Short, Blusa, Vestido, Saia, Jaqueta, Casaco)",
  "sleeve_type": "Tipo de manga (Curta, Longa, 3/4, Sem Mangas, Tomara que caia)",
  "gender": "Gênero (Masculino, Feminino, Meninos, Meninas, Bebês, Sem gênero, Sem gênero infantil)",
  "color": "Cor principal do produto (ex: Azul, Vermelho, Preto, Branco, Verde, Amarelo, Rosa, Cinza, Marrom, Roxo)",
  "modelo": "5 variações do nome do produto separadas por vírgula (ex: Camiseta Básica, Camiseta Casual, Camisa Dia a Dia, Camisa Lisa, Camisa para Trabalhar)"
}`;

    const userPrompt = `Analise este produto e gere os metadados baseados no título e análise da fotografia:

=== TÍTULO DO PRODUTO ===
${title}

=== ANÁLISE DA FOTOGRAFIA ===
${imageAnalysis ? imageAnalysis.contextual_analysis : 'Nenhuma análise de imagem disponível'}

=== DADOS DO PRODUTO VTEX ===
Nome Original: ${product.name}
Marca: ${product.brand_name || 'N/A'}
Categoria: ${product.category_name || 'N/A'}

=== ESPECIFICAÇÕES TÉCNICAS ===
${specifications.length > 0 ? specifications.map((spec, index) => `
${index + 1}. ${spec.field_name}: ${spec.field_value_ids || 'N/A'} ${spec.field_group_name ? `(Grupo: ${spec.field_group_name})` : ''}
`).join('') : 'Nenhuma especificação encontrada'}

Gere os metadados baseados nas informações fornecidas. Seja específico e use apenas valores válidos para cada campo.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: parseFloat(agent.temperature) || 0.2,
        response_format: { type: 'json_object' },
        stream: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro na API OpenAI para metadados:', response.status, errorData);
      throw new Error(`Erro na API OpenAI: ${response.status}`);
    }

    const responseData = await response.json();
    const content = responseData.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const parsedContent = JSON.parse(content);
    console.log('📊 Metadados gerados:', JSON.stringify(parsedContent, null, 2));
    
    return {
      success: true,
      data: {
        clothing_type: parsedContent.clothing_type || 'Produto de Vestuário',
        sleeve_type: parsedContent.sleeve_type || 'Curta',
        gender: parsedContent.gender || 'Sem gênero',
        color: parsedContent.color || 'Multicolorido',
        modelo: parsedContent.modelo || 'Produto Básico, Produto Casual, Produto Simples, Produto Essencial, Produto Versátil',
        tokensUsed: responseData.usage?.total_tokens || 0,
        tokensPrompt: responseData.usage?.prompt_tokens || 0,
        tokensCompletion: responseData.usage?.completion_tokens || 0,
        cost: calculateOpenAICost(responseData.usage?.total_tokens || 0, agent.model || 'gpt-4o-mini'),
        requestId: responseData.id || '',
        responseTime: Date.now()
      }
    };

  } catch (error: any) {
    console.error('❌ Erro ao gerar metadados do produto:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para gerar parágrafo baseado no título e análise de fotografia
async function generateParagraphFromTitleAndImage(
  product: any,
  imageAnalysis: any,
  title: string,
  productId: number,
  openaiApiKey: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    console.log('📝 Gerando parágrafo baseado no título e análise de fotografia...');
    
    const systemPrompt = `Você é um especialista em marketing para e-commerce. Sua tarefa é criar APENAS um parágrafo descritivo baseado no título do produto e na análise da fotografia.

REGRAS IMPORTANTES:
1. Crie APENAS UM parágrafo de 3-4 frases
2. Baseie-se no título fornecido e na análise da fotografia
3. Use linguagem persuasiva mas honesta
4. Foque nos benefícios e características visuais
5. Inclua uma referência ao futebol ou esporte
6. Use no máximo 100 palavras
7. Seja específico sobre o que se vê na foto
8. Não invente informações que não estão no título ou análise

FORMATO DE RESPOSTA:
Retorne APENAS o parágrafo, sem formatação adicional, sem aspas, sem explicações.`;

    const userPrompt = `Crie um parágrafo descritivo para este produto:

=== TÍTULO DO PRODUTO ===
${title}

=== ANÁLISE DA FOTOGRAFIA ===
${imageAnalysis ? imageAnalysis.contextual_analysis : 'Nenhuma análise de imagem disponível'}

=== INFORMAÇÕES BÁSICAS ===
Produto: ${product.name}
Marca: ${product.brand_name || 'N/A'}
Categoria: ${product.category_name || 'N/A'}

Crie um parágrafo que descreva o produto baseado no título e no que se vê na fotografia. Inclua uma referência ao futebol ou esporte.`;

    console.log('🌐 Chamando API da OpenAI para gerar parágrafo...');
    const startTime = Date.now();
    
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
        max_tokens: 150,
        temperature: 0.3,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro na API OpenAI:', response.status, errorData);
      throw new Error(`Erro na API OpenAI: ${response.status}`);
    }

    const responseData = await response.json();
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log('✅ Parágrafo gerado');
    console.log(`⏱️ Tempo de resposta: ${responseTime}ms`);

    const content = responseData.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const paragraph = content.trim();
    console.log('📝 Parágrafo gerado:', paragraph);

    // Salvar parágrafo no banco (usando a tabela marketplace)
    const insertQuery = `
      UPDATE marketplace 
      SET description = ?, 
          openai_tokens_used = openai_tokens_used + ?,
          updated_at = NOW()
      WHERE product_id = ?
    `;
    
    try {
      await executeQuery(insertQuery, [
        paragraph,
        responseData.usage?.total_tokens || 0,
        productId
      ]);
      console.log('✅ Parágrafo salvo no banco');
    } catch (insertError) {
      console.error('❌ Erro ao salvar parágrafo:', insertError);
    }
    
    return {
      success: true,
      data: paragraph
    };

  } catch (error: any) {
    console.error('❌ Erro ao gerar parágrafo:', error);
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

// Função para verificar se título já existe no banco (MELHORADA)
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
      
      const generatedTitle = (openaiResponse.data as any)?.title;
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
              description: (openaiResponse.data as any)?.description,
              clothing_type: (openaiResponse.data as any)?.clothing_type,
              sleeve_type: (openaiResponse.data as any)?.sleeve_type,
              gender: (openaiResponse.data as any)?.gender,
              color: (openaiResponse.data as any)?.color,
              modelo: (openaiResponse.data as any)?.modelo,
              tokensUsed: (openaiResponse.data as any)?.tokensUsed,
              tokensPrompt: (openaiResponse.data as any)?.tokensPrompt,
              tokensCompletion: (openaiResponse.data as any)?.tokensCompletion,
              cost: (openaiResponse.data as any)?.cost,
              requestId: (openaiResponse.data as any)?.requestId,
              responseTime: (openaiResponse.data as any)?.responseTime
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
            description: (openaiResponse.data as any)?.description,
            clothing_type: (openaiResponse.data as any)?.clothing_type,
            sleeve_type: (openaiResponse.data as any)?.sleeve_type,
            gender: (openaiResponse.data as any)?.gender,
            color: (openaiResponse.data as any)?.color,
            modelo: (openaiResponse.data as any)?.modelo,
            tokensUsed: (openaiResponse.data as any)?.tokensUsed,
            tokensPrompt: (openaiResponse.data as any)?.tokensPrompt,
            tokensCompletion: (openaiResponse.data as any)?.tokensCompletion,
            cost: (openaiResponse.data as any)?.cost,
            requestId: (openaiResponse.data as any)?.requestId,
            responseTime: (openaiResponse.data as any)?.responseTime
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

// Matriz de variação para títulos otimizados (Manual Prático)
const TITLE_MATRIX = {
  // Grupo 1 — Cor
  colors: {
    basic: ['Vermelha', 'Azul', 'Preta', 'Branca', 'Cinza', 'Verde', 'Amarela'],
    fashion: ['Bordô', 'Marinho', 'Bege', 'Off White', 'Vinho', 'Cáqui', 'Roxa', 'Rosa', 'Laranja'],
    compound: ['Azul Marinho', 'Preto Fosco', 'Cinza Mescla', 'Verde Militar', 'Branco Gelo', 'Vermelho Escuro']
  },
  
  // Grupo 2 — Público
  audience: {
    gender: ['Masculina', 'Feminina', 'Unissex'],
    age: ['Juvenil', 'Infantil', 'Adulto']
  },
  
  // Grupo 3 — Estilo / Modelo
  style: {
    fit: ['Slim Fit', 'Regular Fit'],
    lifestyle: ['Casual', 'Streetwear', 'Urbana', 'Fashion', 'Lifestyle', 'Elegante', 'Esportiva', 'Social', 'Básica', 'Clássica', 'Moderno', 'Exclusivo']
  },
  
  // Grupo 4 — Atributos de Produto
  attributes: {
    material: ['Algodão', 'Premium', 'Original', 'Exclusiva'],
    comfort: ['Conforto', 'Confortável', 'Leve', 'Macia'],
    quality: ['Atemporal', 'Versátil', 'Autêntica', 'Sofisticada', 'Durável', 'Resistente', 'Clássica'],
    fit: ['Ajuste Perfeito', 'Estilo Único', 'Qualidade Superior']
  }
};

// Função para gerar título único com matriz de variação (MELHORADA)
async function generateUniqueTitleWithMatrix(
  product: any, 
  imageAnalysis: any, 
  productId: number, 
  skus: any[], 
  specifications: any[], 
  agent: any,
  maxAttempts: number = 10
): Promise<{ success: boolean; title?: string; error?: string }> {
  
  console.log('🎯 Gerando título único com matriz de variação...');
  
  // Extrair informações do produto
  const productName = product.name || '';
  const brandName = product.brand_name || '';
  const categoryName = product.category_name || '';
  
  // Detectar categoria base do produto
  const baseCategory = detectProductCategory(productName, categoryName);
  
  // Detectar cor da análise de imagem ou especificações (PRIORIDADE: IMAGEM > ESPECIFICAÇÕES > NOME)
  const detectedColor = detectColorFromAnalysis(imageAnalysis, specifications, productName);
  
  // Detectar público-alvo
  const targetAudience = detectTargetAudience(productName, specifications);
  
  console.log(`📋 Dados detectados: Categoria="${baseCategory}", Marca="${brandName}", Cor="${detectedColor}", Público="${targetAudience}"`);
  
  // Primeiro, tentar com a matriz de variação
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt + 1}/${maxAttempts} de geração de título...`);
      
      // Gerar combinação única usando a matriz
      const title = generateTitleFromMatrix(baseCategory, brandName, detectedColor, targetAudience, attempt);
      
      console.log(`📝 Título gerado: "${title}"`);
      
      // VALIDAÇÃO: Verificar se o título está alinhado com a análise de imagem
      const validation = validateTitleAgainstImageAnalysis(title, imageAnalysis, productName);
      if (!validation.isValid) {
        console.log('❌ Título não está alinhado com a análise de imagem:', validation.issues);
        continue; // Tentar novamente
      }
      
      // Verificar se o título já existe
      const exists = await checkTitleExists(title, productId);
      if (!exists) {
        console.log('✅ Título único e válido gerado com sucesso!');
        return { success: true, title };
      } else {
        console.log('⚠️ Título já existe, tentando novamente...');
      }
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt + 1}:`, error);
    }
  }
  
  // Se a matriz não funcionou, tentar com variações mais agressivas
  console.log('🔄 Tentando variações mais agressivas...');
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const aggressiveTitle = generateAggressiveVariation(baseCategory, brandName, detectedColor, targetAudience, attempt);
      console.log(`📝 Título agressivo gerado: "${aggressiveTitle}"`);
      
      // VALIDAÇÃO: Verificar se o título está alinhado com a análise de imagem
      const validation = validateTitleAgainstImageAnalysis(aggressiveTitle, imageAnalysis, productName);
      if (!validation.isValid) {
        console.log('❌ Título agressivo não está alinhado com a análise de imagem:', validation.issues);
        continue; // Tentar novamente
      }
      
      const exists = await checkTitleExists(aggressiveTitle, productId);
      if (!exists) {
        console.log('✅ Título único e válido gerado com variação agressiva!');
        return { success: true, title: aggressiveTitle };
      }
    } catch (error) {
      console.error(`❌ Erro na variação agressiva ${attempt + 1}:`, error);
    }
  }
  
  // Último recurso: fallback com timestamp
  console.log('⚠️ Usando fallback com timestamp...');
  const timestamp = Date.now().toString().slice(-6);
  const fallbackTitle = `${baseCategory} ${brandName} ${detectedColor} ${targetAudience} ${timestamp}`;
  const finalTitle = fallbackTitle.length <= 60 ? fallbackTitle : truncateTitleIntelligently(fallbackTitle, 60);
  
  console.log(`📝 Título final (fallback): "${finalTitle}"`);
  return { success: true, title: finalTitle };
}

// Função para gerar variações mais agressivas quando a matriz não funciona
function generateAggressiveVariation(
  baseCategory: string, 
  brandName: string, 
  color: string, 
  audience: string, 
  attempt: number
): string {
  const aggressiveVariations = [
    'Exclusivo', 'Premium', 'Limited', 'Special', 'Unique', 'Rare', 'Elite',
    'Pro', 'Max', 'Ultra', 'Super', 'Mega', 'Turbo', 'Hyper'
  ];
  
  const randomVariation = aggressiveVariations[attempt % aggressiveVariations.length];
  const timestamp = Date.now().toString().slice(-4);
  
  // Tentar diferentes estruturas
  const structures = [
    `${baseCategory} ${brandName} ${color} ${audience} ${randomVariation}`,
    `${baseCategory} ${brandName} ${randomVariation} ${color} ${audience}`,
    `${baseCategory} ${brandName} ${color} ${audience} ${randomVariation} ${timestamp}`,
    `${baseCategory} ${brandName} ${color} ${audience} ${timestamp}`
  ];
  
  const selectedStructure = structures[attempt % structures.length];
  return selectedStructure.length <= 60 ? selectedStructure : truncateTitleIntelligently(selectedStructure, 60);
}

// Função para detectar categoria base do produto
function detectProductCategory(productName: string, categoryName: string): string {
  const name = (productName + ' ' + categoryName).toLowerCase();
  
  if (name.includes('camisa') || name.includes('polo')) return 'Camisa Polo';
  if (name.includes('camiseta') || name.includes('t-shirt')) return 'Camiseta';
  if (name.includes('moletom') || name.includes('hoodie')) return 'Moletom';
  if (name.includes('calça') || name.includes('pants')) return 'Calça';
  if (name.includes('short') || name.includes('bermuda')) return 'Short';
  if (name.includes('blusa') || name.includes('blouse')) return 'Blusa';
  if (name.includes('vestido') || name.includes('dress')) return 'Vestido';
  if (name.includes('saia') || name.includes('skirt')) return 'Saia';
  if (name.includes('jaqueta') || name.includes('jacket')) return 'Jaqueta';
  if (name.includes('casaco') || name.includes('coat')) return 'Casaco';
  
  return 'Produto';
}

// Função para detectar cor com validação contra análise de imagem
function detectColorFromAnalysis(imageAnalysis: any, specifications: any[], productName: string): string {
  console.log('🎨 Detectando cor do produto...');
  
  // Tentar extrair cor da análise de imagem (PRIORIDADE MÁXIMA)
  if (imageAnalysis?.contextual_analysis) {
    const analysis = imageAnalysis.contextual_analysis.toLowerCase();
    console.log('🖼️ Analisando imagem:', analysis.substring(0, 100) + '...');
    
    for (const colorGroup of Object.values(TITLE_MATRIX.colors)) {
      for (const color of colorGroup) {
        if (analysis.includes(color.toLowerCase())) {
          console.log(`✅ Cor detectada na imagem: ${color}`);
          return color;
        }
      }
    }
  }
  
  // Tentar extrair cor das especificações
  if (specifications && specifications.length > 0) {
    console.log('📋 Verificando especificações...');
    for (const spec of specifications) {
      if (spec.field_name?.toLowerCase().includes('cor') || spec.field_name?.toLowerCase().includes('color')) {
        const colorValue = spec.field_value_ids?.toLowerCase();
        if (colorValue) {
          for (const colorGroup of Object.values(TITLE_MATRIX.colors)) {
            for (const color of colorGroup) {
              if (colorValue.includes(color.toLowerCase())) {
                console.log(`✅ Cor detectada nas especificações: ${color}`);
                return color;
              }
            }
          }
        }
      }
    }
  }
  
  // Tentar extrair cor do nome do produto
  const name = productName.toLowerCase();
  console.log('📝 Verificando nome do produto:', name);
  for (const colorGroup of Object.values(TITLE_MATRIX.colors)) {
    for (const color of colorGroup) {
      if (name.includes(color.toLowerCase())) {
        console.log(`✅ Cor detectada no nome: ${color}`);
        return color;
      }
    }
  }
  
  // Cor padrão se não conseguir detectar
  console.log('⚠️ Cor não detectada, usando padrão: Multicolor');
  return 'Multicolor';
}

// Função para validar se o título está alinhado com a análise de imagem
function validateTitleAgainstImageAnalysis(title: string, imageAnalysis: any, productName: string): { isValid: boolean; issues: string[] } {
  console.log('🔍 Validando título contra análise de imagem...');
  console.log('📝 Título a validar:', title);
  
  const issues: string[] = [];
  const titleLower = title.toLowerCase();
  
  if (!imageAnalysis?.contextual_analysis) {
    console.log('⚠️ Nenhuma análise de imagem disponível para validação');
    return { isValid: true, issues: [] }; // Se não há análise, não pode validar
  }
  
  const analysis = imageAnalysis.contextual_analysis.toLowerCase();
  console.log('🖼️ Análise de imagem:', analysis.substring(0, 200) + '...');
  
  // 1. Validar cor
  const detectedColor = detectColorFromAnalysis(imageAnalysis, [], productName);
  if (detectedColor !== 'Multicolor') {
    const titleHasColor = Object.values(TITLE_MATRIX.colors).flat().some(color => 
      titleLower.includes(color.toLowerCase())
    );
    
    if (!titleHasColor) {
      issues.push(`Título não contém cor detectada na imagem: ${detectedColor}`);
    } else {
      // Verificar se a cor no título corresponde à cor detectada
      const titleColor = Object.values(TITLE_MATRIX.colors).flat().find(color => 
        titleLower.includes(color.toLowerCase())
      );
      
      if (titleColor && titleColor.toLowerCase() !== detectedColor.toLowerCase()) {
        issues.push(`Cor no título (${titleColor}) não corresponde à cor detectada na imagem (${detectedColor})`);
      }
    }
  }
  
  // 2. Validar categoria/tipo de produto
  const detectedCategory = detectProductCategoryFromAnalysis(analysis);
  if (detectedCategory) {
    const titleHasCategory = titleLower.includes(detectedCategory.toLowerCase());
    if (!titleHasCategory) {
      issues.push(`Título não contém categoria detectada na imagem: ${detectedCategory}`);
    }
  }
  
  // 3. Validar gênero se detectado
  const detectedGender = detectGenderFromAnalysis(analysis);
  if (detectedGender) {
    const titleHasGender = titleLower.includes(detectedGender.toLowerCase());
    if (!titleHasGender) {
      issues.push(`Título não contém gênero detectado na imagem: ${detectedGender}`);
    }
  }
  
  const isValid = issues.length === 0;
  console.log(`📊 Validação: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
  if (issues.length > 0) {
    console.log('⚠️ Problemas encontrados:', issues);
  }
  
  return { isValid, issues };
}

// Função para detectar categoria do produto na análise de imagem
function detectProductCategoryFromAnalysis(analysis: string): string | null {
  if (analysis.includes('camisa') || analysis.includes('polo') || analysis.includes('shirt')) {
    return 'Camisa Polo';
  }
  if (analysis.includes('camiseta') || analysis.includes('t-shirt') || analysis.includes('tshirt')) {
    return 'Camiseta';
  }
  if (analysis.includes('moletom') || analysis.includes('hoodie') || analysis.includes('sweatshirt')) {
    return 'Moletom';
  }
  if (analysis.includes('calça') || analysis.includes('pants') || analysis.includes('jeans')) {
    return 'Calça';
  }
  if (analysis.includes('short') || analysis.includes('bermuda') || analysis.includes('shorts')) {
    return 'Short';
  }
  if (analysis.includes('blusa') || analysis.includes('blouse') || analysis.includes('top')) {
    return 'Blusa';
  }
  if (analysis.includes('vestido') || analysis.includes('dress')) {
    return 'Vestido';
  }
  if (analysis.includes('jaqueta') || analysis.includes('jacket') || analysis.includes('blazer')) {
    return 'Jaqueta';
  }
  return null;
}

// Função para detectar gênero na análise de imagem
function detectGenderFromAnalysis(analysis: string): string | null {
  if (analysis.includes('masculino') || analysis.includes('masculina') || analysis.includes('male') || analysis.includes('men')) {
    return 'Masculina';
  }
  if (analysis.includes('feminino') || analysis.includes('feminina') || analysis.includes('female') || analysis.includes('women')) {
    return 'Feminina';
  }
  if (analysis.includes('unissex') || analysis.includes('unisex') || analysis.includes('unisex')) {
    return 'Unissex';
  }
  return null;
}

// Função para detectar público-alvo
function detectTargetAudience(productName: string, specifications: any[]): string {
  const name = productName.toLowerCase();
  
  // Verificar especificações primeiro
  if (specifications && specifications.length > 0) {
    for (const spec of specifications) {
      if (spec.field_name?.toLowerCase().includes('gênero') || spec.field_name?.toLowerCase().includes('gender')) {
        const value = spec.field_value_ids?.toLowerCase();
        if (value?.includes('masculino') || value?.includes('male')) return 'Masculina';
        if (value?.includes('feminino') || value?.includes('female')) return 'Feminina';
        if (value?.includes('unissex') || value?.includes('unisex')) return 'Unissex';
      }
    }
  }
  
  // Verificar no nome do produto
  if (name.includes('masculino') || name.includes('masculina') || name.includes('male')) return 'Masculina';
  if (name.includes('feminino') || name.includes('feminina') || name.includes('female')) return 'Feminina';
  if (name.includes('unissex') || name.includes('unisex')) return 'Unissex';
  if (name.includes('infantil') || name.includes('kids')) return 'Infantil';
  if (name.includes('juvenil') || name.includes('teen')) return 'Juvenil';
  
  return 'Unissex'; // Padrão
}

// Função para gerar título usando a matriz
function generateTitleFromMatrix(
  baseCategory: string, 
  brandName: string, 
  color: string, 
  audience: string, 
  attempt: number
): string {
  // Estrutura fixa: [Categoria] [Marca] [Cor] [Público] [Estilo] [Atributo]
  
  // Selecionar estilo baseado na tentativa para criar variação
  const styleOptions = [
    ...TITLE_MATRIX.style.fit,
    ...TITLE_MATRIX.style.lifestyle
  ];
  const selectedStyle = styleOptions[attempt % styleOptions.length];
  
  // Selecionar atributo baseado na tentativa
  const attributeOptions = [
    ...TITLE_MATRIX.attributes.material,
    ...TITLE_MATRIX.attributes.comfort,
    ...TITLE_MATRIX.attributes.quality,
    ...TITLE_MATRIX.attributes.fit
  ];
  const selectedAttribute = attributeOptions[attempt % attributeOptions.length];
  
  // Construir título
  const title = `${baseCategory} ${brandName} ${color} ${audience} ${selectedStyle} ${selectedAttribute}`;
  
  // Verificar se está dentro do limite de 60 caracteres
  if (title.length <= 60) {
    return title;
  }
  
  // Se exceder, tentar versão mais curta
  const shortTitle = `${baseCategory} ${brandName} ${color} ${audience} ${selectedAttribute}`;
  return shortTitle.length <= 60 ? shortTitle : truncateTitleIntelligently(shortTitle, 60);
}

// Função para gerar múltiplas variações de títulos (para demonstração)
function generateMultipleTitleVariations(
  baseCategory: string, 
  brandName: string, 
  color: string, 
  audience: string, 
  maxVariations: number = 10
): string[] {
  const variations: string[] = [];
  
  const styleOptions = [
    ...TITLE_MATRIX.style.fit,
    ...TITLE_MATRIX.style.lifestyle
  ];
  
  const attributeOptions = [
    ...TITLE_MATRIX.attributes.material,
    ...TITLE_MATRIX.attributes.comfort,
    ...TITLE_MATRIX.attributes.quality,
    ...TITLE_MATRIX.attributes.fit
  ];
  
  for (let i = 0; i < maxVariations && i < styleOptions.length * attributeOptions.length; i++) {
    const styleIndex = i % styleOptions.length;
    const attributeIndex = Math.floor(i / styleOptions.length) % attributeOptions.length;
    
    const selectedStyle = styleOptions[styleIndex];
    const selectedAttribute = attributeOptions[attributeIndex];
    
    const title = `${baseCategory} ${brandName} ${color} ${audience} ${selectedStyle} ${selectedAttribute}`;
    
    if (title.length <= 60) {
      variations.push(title);
    } else {
      // Versão mais curta
      const shortTitle = `${baseCategory} ${brandName} ${color} ${audience} ${selectedAttribute}`;
      if (shortTitle.length <= 60) {
        variations.push(shortTitle);
      }
    }
  }
  
  return variations;
}

// Função para gerar título único com variações criativas (MANTIDA PARA COMPATIBILIDADE)
async function generateUniqueTitleWithVariations(
  product: any, 
  imageAnalysis: any, 
  productId: number, 
  skus: any[], 
  specifications: any[], 
  agent: any,
  maxAttempts: number = 10
): Promise<{ success: boolean; title?: string; error?: string }> {
  
  console.log('🎯 Gerando título único com variações criativas...');
  
  // Variações criativas para substituir números sequenciais
  const creativeVariations = [
    'Premium', 'Exclusivo', 'Tendência', 'Moderno', 'Estiloso', 'Elegante',
    'Confortável', 'Versátil', 'Clássico', 'Contemporâneo', 'Sofisticado',
    'Descolado', 'Fashion', 'Urbano', 'Casual', 'Esportivo', 'Minimalista',
    'Vintage', 'Retrô', 'Chic', 'Glamour', 'Boho', 'Street', 'Athletic',
    'Business', 'Relaxed', 'Trendy', 'Cool', 'Fresh', 'Dynamic', 'Bold'
  ];

  const styleVariations = [
    'Estilo Urbano', 'Look Casual', 'Visual Moderno', 'Fashion Statement',
    'Para o Dia a Dia', 'Ideal para Trabalho', 'Perfeito para Festas',
    'Que Faz Sucesso', 'Que Vai Te Surpreender', 'Que Você Vai Amar',
    'Conforto Garantido', 'Qualidade Premium', 'Design Exclusivo'
  ];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt + 1}/${maxAttempts} de geração de título...`);
      
      // Escolher variação criativa baseada na tentativa
      let variationPrompt = '';
      if (attempt === 0) {
        variationPrompt = 'Crie um título original e único.';
      } else if (attempt === 1) {
        const randomVariation = creativeVariations[Math.floor(Math.random() * creativeVariations.length)];
        variationPrompt = `Crie um título único usando a palavra "${randomVariation}" ou similar.`;
      } else {
        const randomStyle = styleVariations[Math.floor(Math.random() * styleVariations.length)];
        variationPrompt = `Crie um título único com foco em "${randomStyle}".`;
      }

      const systemPrompt = `Você é um especialista em marketing e SEO para e-commerce. 
Crie APENAS um título de produto otimizado para marketplace seguindo estas regras:

ESTRUTURA OBRIGATÓRIA (MÁXIMO 60 CARACTERES):
- CATEGORIA + MARCA + GÊNERO + COR + PALAVRAS SEO
- SEMPRE incluir: Categoria, Marca, Gênero (Masculino/Feminino/Unissex), Cor
- SEMPRE incluir palavras-chave SEO para melhorar busca
- Use ADJETIVOS PODEROSOS: "Premium", "Exclusivo", "Tendência", "Moderno", "Estiloso"
- Inclua PALAVRAS DE AÇÃO: "Descubra", "Experimente", "Conquiste", "Transforme"
- Mencione OCASIÕES DE USO: "Para o Dia a Dia", "Ideal para Trabalho", "Perfeito para Festas"
- Use TENDÊNCIAS DE MODA: "Estilo Urbano", "Look Casual", "Visual Moderno", "Fashion"
- Inclua SENTIMENTOS: "Confortável", "Elegante", "Descolado", "Sofisticado"

REGRAS IMPORTANTES:
- NUNCA use hífens (-) no título
- Use apenas espaços para separar as palavras
- Mantenha a estrutura: CATEGORIA + MARCA + GÊNERO + COR + PALAVRAS SEO
- ${variationPrompt}
- O título deve ser ÚNICO e ATRATIVO
- Evite palavras genéricas como "Básico" ou "Simples"

EXEMPLOS DE ESTRUTURA CORRETA:
✅ "Camiseta Nike Masculino Azul Premium Estilo Urbano"
✅ "Moletom Adidas Feminino Preto Confortável Casual"
✅ "Calça Puma Unissex Cinza Moderna Esportiva"

Responda APENAS com o título, sem explicações ou formatação adicional.`;

      const userPrompt = `Crie um título único para este produto:

=== DADOS BÁSICOS ===
PRODUTO ORIGINAL: ${product.name}
MARCA: ${product.brand_name || 'N/A'}
CATEGORIA: ${product.category_name || 'N/A'}
GÊNERO: ${product.gender || 'Unissex'}

=== ANÁLISE DE IMAGEM ===
${imageAnalysis ? imageAnalysis.contextual_analysis : 'Nenhuma análise disponível'}

=== ESPECIFICAÇÕES ===
${specifications.length > 0 ? specifications.map(spec => `${spec.field_name}: ${spec.field_value_ids}`).join('\n') : 'Nenhuma especificação'}

Crie um título ÚNICO, ATRATIVO e OTIMIZADO para SEO.`;

      const response = await agent.generateContent([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      if (response && response.text) {
        let generatedTitle = response.text.trim();
        
        // Limpar o título de possíveis formatações extras
        generatedTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();
        
        // Verificar se o título está dentro do limite
        if (generatedTitle.length > 60) {
          generatedTitle = truncateTitleIntelligently(generatedTitle, 60);
        }
        
        console.log(`📝 Título gerado: "${generatedTitle}"`);
        
        // Verificar se o título já existe
        const exists = await checkTitleExists(generatedTitle, productId);
        if (!exists) {
          console.log('✅ Título único gerado com sucesso!');
          return { success: true, title: generatedTitle };
        } else {
          console.log('⚠️ Título já existe, tentando novamente...');
        }
      }
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt + 1}:`, error);
    }
  }
  
  // Se todas as tentativas falharam, usar fallback com timestamp
  console.log('⚠️ Todas as tentativas falharam, usando fallback...');
  const fallbackTitle = `${product.name} ${Date.now().toString().slice(-4)}`;
  return { 
    success: true, 
    title: fallbackTitle.length <= 60 ? fallbackTitle : truncateTitleIntelligently(fallbackTitle, 60)
  };
}

// Função para gerar título único (versão simplificada para compatibilidade)
async function generateUniqueTitle(baseTitle: string, productId: number, maxAttempts: number = 10): Promise<string> {
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

    // 6. Verificar se já existe título gerado
    console.log('🔍 Verificando se já existe título gerado...');
    let existingTitle = null;
    try {
      const titleQuery = `SELECT title FROM titles WHERE product_id = ? AND status = 'validated'`;
      const titleResult = await executeQuery(titleQuery, [numericProductId]);
      if (titleResult && titleResult.length > 0) {
        existingTitle = titleResult[0].title;
        console.log('✅ Título existente encontrado:', existingTitle);
      } else {
        console.log('❌ Nenhum título encontrado. Execute a geração de título primeiro.');
        return NextResponse.json({
          success: false,
          message: 'Nenhum título encontrado. Execute a geração de título primeiro.'
        }, { status: 400 });
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar título existente:', error);
      return NextResponse.json({
        success: false,
        message: 'Erro ao verificar título existente'
      }, { status: 500 });
    }

    // 7. Gerar metadados do produto (clothing_type, sleeve_type, gender, color, modelo)
    console.log('📝 ETAPA 2: Gerando metadados do produto...');
    const metadataStartTime = Date.now();
    const metadataResponse = await generateProductMetadata(product, imageAnalysis, skus, specifications, agent, existingTitle);
    const metadataGenerationTime = Date.now() - metadataStartTime;
    console.log(`📝 Metadados gerados (${metadataGenerationTime}ms):`, metadataResponse.success ? 'Sucesso' : 'Erro');
    
    if (!metadataResponse.success) {
      console.log('❌ Erro na geração dos metadados:', metadataResponse.error);
      return NextResponse.json({
        success: false,
        message: metadataResponse.error || 'Erro ao gerar metadados do produto'
      }, { status: 500 });
    }

    const { clothing_type, sleeve_type, gender, color, modelo, tokensUsed } = metadataResponse.data || {};
    console.log('📝 Metadados gerados:', { clothing_type, sleeve_type, gender, color });

    // 8. Salvar no banco de dados
    console.log('💾 Salvando no banco de dados...');
    let saveResult;
    try {
      saveResult = await saveMarketplaceDescription({
        productId: numericProductId,
        title: existingTitle,
        description: '', // Será preenchido pelo parágrafo
        openaiModel: agent.model || 'gpt-4o-mini',
        tokensUsed: metadataResponse.data?.tokensUsed || 0,
        tokensPrompt: metadataResponse.data?.tokensPrompt || 0,
        tokensCompletion: metadataResponse.data?.tokensCompletion || 0,
        cost: metadataResponse.data?.cost || 0,
        requestId: metadataResponse.data?.requestId || '',
        responseTime: metadataResponse.data?.responseTime || 0,
        maxTokens: parseInt(agent.max_tokens) || 3000,
        temperature: parseFloat(agent.temperature) || 0.7,
        // Metadados do produto
        clothing_type: clothing_type,
        sleeve_type: sleeve_type,
        gender: gender,
        color: color,
        modelo: modelo
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

    // 9. Gerar parágrafo baseado no título e análise de fotografia
    console.log('📝 Gerando parágrafo baseado no título e análise de fotografia...');
    console.log('📦 Produto:', product.name);
    console.log('🖼️ Análise de imagem:', imageAnalysis ? 'Disponível' : 'Não disponível');
    console.log('📝 Título:', existingTitle);
    console.log('🔑 Chave OpenAI:', process.env.OPENAI_API_KEY ? 'Configurada' : 'NÃO CONFIGURADA');
    
    let description = '';
    
    const paragraphResponse = await generateParagraphFromTitleAndImage(
      product,
      imageAnalysis,
      existingTitle,
      numericProductId,
      process.env.OPENAI_API_KEY || ''
    );

    if (paragraphResponse.success) {
      console.log('✅ Parágrafo gerado com sucesso');
      // Atualizar a descrição com o parágrafo gerado
      description = paragraphResponse.data || description;
    } else {
      console.log('⚠️ Erro ao gerar parágrafo:', paragraphResponse.error);
    }

    console.log('✅ Descrição do Marketplace gerada com sucesso!');
    return NextResponse.json({
      success: true,
      data: {
        ...saveResult.data,
        title: existingTitle,
        description,
        clothing_type,
        sleeve_type,
        gender,
        color,
        modelo,
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
    let systemPrompt = agent.system_prompt || `Você é um especialista em e-commerce e marketing digital, focado especificamente no Marketplace. Sua tarefa é criar APENAS títulos otimizados para produtos de moda e vestuário que maximizem a visibilidade e conversão no Marketplace.

REGRAS IMPORTANTES:
1. Título deve ter MÁXIMO 60 caracteres (limite obrigatório do Marketplace)
2. Use palavras-chave relevantes para SEO
3. Seja persuasivo mas honesto
4. Foque nos benefícios para o cliente
5. Use linguagem clara e direta
6. NUNCA AFIRME materiais específicos (como "100% algodão", "poliéster", etc.) sem ter certeza absoluta
7. Use termos genéricos como "material de qualidade", "tecido selecionado", "composição premium" quando não souber o material exato`;

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

    // Se um título foi pré-definido, usar ele na descrição
    if (predefinedTitle) {
      systemPrompt += `

TÍTULO PRÉ-DEFINIDO OBRIGATÓRIO:
- Use EXCLUSIVAMENTE o título: "${predefinedTitle}"
- TODA a descrição deve referenciar o produto por este título EXATO
- NÃO altere, modifique, abreve ou gere um novo título
- O título já foi otimizado e é único no banco de dados
- NÃO gere um novo título, use APENAS o fornecido
- Foque APENAS na geração da descrição usando este título
- IMPORTANTE: Em todas as seções (FAQ, Call-to-action, etc.) use este título exato: "${predefinedTitle}"`;
    } else {
      // Só incluir instruções de título se não houver título pré-definido
      systemPrompt += `

ESTRUTURA OBRIGATÓRIA DO TÍTULO (MÁXIMO 60 CARACTERES):
- CATEGORIA + MARCA + GÊNERO + COR + PALAVRAS SEO
- SEMPRE incluir: Categoria, Marca, Gênero (Masculino/Feminino/Unissex), Cor
- SEMPRE incluir palavras-chave SEO para melhorar busca
- Use ADJETIVOS PODEROSOS: "Premium", "Exclusivo", "Tendência", "Moderno", "Estiloso"
- Inclua PALAVRAS DE AÇÃO: "Descubra", "Experimente", "Conquiste", "Transforme"
- Mencione OCASIÕES DE USO: "Para o Dia a Dia", "Ideal para Trabalho", "Perfeito para Festas"
- Use TENDÊNCIAS DE MODA: "Estilo Urbano", "Look Casual", "Visual Moderno", "Fashion"
- Inclua SENTIMENTOS: "Confortável", "Elegante", "Descolado", "Sofisticado"
- Use EMOÇÕES: "Que Vai Te Surpreender", "Que Você Vai Amar", "Que Faz Sucesso"

EXEMPLOS DE ESTRUTURA CORRETA (SEM HÍFENS):
✅ "Camiseta Nike Masculino Azul Premium Estilo Urbano"
✅ "Moletom Adidas Feminino Preto Confortável Casual"
✅ "Calça Puma Unissex Cinza Moderna Esportiva"
✅ "Blusa Hering Feminino Branco Básica Versátil"

EXEMPLOS DE TÍTULOS CRIATIVOS (SEM HÍFENS):
❌ Ruim: "Camiseta Stance Verde Militar"
✅ Bom: "Camiseta Stance Verde Militar Estilo Urbano"
✅ Melhor: "Camiseta Stance Verde Militar Masculino Look Moderno"
✅ Excelente: "Camiseta Stance Verde Militar Masculino Estilo Urbano"

❌ Ruim: "Moletom Básico Cinza"
✅ Bom: "Moletom Premium Cinza Conforto Garantido"
✅ Melhor: "Moletom Cinza Premium Ideal para o Dia a Dia"
✅ Excelente: "Moletom Cinza Premium Feminino Confortável"

ESTRUTURA DA DESCRIÇÃO (MÍNIMO 300 PALAVRAS):
- Parágrafo introdutório sobre o produto COM REFERÊNCIA AO FUTEBOL (40-60 palavras) - OBRIGATÓRIO incluir menção ao futebol, esporte ou estilo esportivo
- Informações sobre qualidade e benefícios (40-50 palavras)
- Detalhes técnicos e materiais (50-70 palavras)
- Seção "Destaques do produto" com 4-5 bullet points (50-70 palavras)
- Seção "Material e cuidados" (30-40 palavras)
- Seção "Por que escolher" com 3-4 vantagens (40-50 palavras)
- Seção "FAQ - Perguntas frequentes" com 4-5 perguntas (60-80 palavras)
- Call-to-action final (15-25 palavras)

FORMATO DE RESPOSTA (JSON):
{
  ${predefinedTitle ? `"title": "${predefinedTitle}",` : `"title": "título criativo e otimizado para busca (máximo 60 caracteres)",`}
  "description": "descrição completa estruturada",
  "clothing_type": "Tipo de roupa (ex: Camiseta, Camiseta Polo, Moletom, etc.)",
  "sleeve_type": "Tipo de manga (Curta, Longa, 3/4, Sem Mangas, Tomara que caia)",
  "gender": "Gênero (Masculino, Feminino, Meninos, Meninas, Bebês, Sem gênero, Sem gênero infantil)",
  "color": "Cor principal do produto (ex: Azul, Vermelho, Preto, Branco, etc.)",
  "modelo": "5 variações do nome do produto separadas por vírgula (ex: Camiseta Básica, Camiseta Casual, Camisa Dia a Dia, Camisa Lisa, Camisa para Trabalhar)",
}`;
    }

    const userPrompt = `Crie um título otimizado para o Marketplace para este produto. Responda em formato JSON:

=== DADOS BÁSICOS DO PRODUTO ===
PRODUTO ORIGINAL: ${product.name}
MARCA: ${product.brand_name || 'N/A'}
CATEGORIA: ${product.category_name || 'N/A'}

=== ANÁLISE TÉCNICA DAS IMAGENS ===
${imageAnalysis ? `
${imageAnalysis.contextual_analysis}
` : 'Nenhuma análise de imagem disponível'}

=== ESPECIFICAÇÕES TÉCNICAS ===
${specifications.length > 0 ? specifications.map((spec, index) => `
${index + 1}. ${spec.field_name}: ${spec.field_value_ids || 'N/A'} ${spec.field_group_name ? `(Grupo: ${spec.field_group_name})` : ''}
`).join('') : 'Nenhuma especificação encontrada'}

${predefinedTitle ? `
TÍTULO PRÉ-DEFINIDO OBRIGATÓRIO:
- Use EXCLUSIVAMENTE este título: "${predefinedTitle}"
- NÃO altere, modifique, abreve ou gere um novo título
- O título já foi otimizado e é único no banco de dados
` : `
INSTRUÇÕES CRÍTICAS PARA O TÍTULO: 
- Crie um NOVO TÍTULO seguindo a ESTRUTURA OBRIGATÓRIA
- OBRIGATÓRIO: CATEGORIA + MARCA + GÊNERO + COR + PALAVRAS SEO
- OBRIGATÓRIO: O título DEVE sempre incluir o gênero: "Masculino", "Feminino" ou "Unissex"
- OBRIGATÓRIO: O título DEVE sempre incluir a marca do produto
- OBRIGATÓRIO: O título DEVE sempre incluir a categoria do produto
- OBRIGATÓRIO: O título DEVE sempre incluir a cor detectada
- OBRIGATÓRIO: O título DEVE incluir palavras-chave SEO para melhorar busca
- MÁXIMO 60 CARACTERES no título
- O novo título deve ser mais atrativo e otimizado para SEO
`}

ESTRUTURA EXEMPLO (SEM HÍFENS):
"Camiseta Nike Masculino Azul Premium Estilo Urbano"
"Moletom Adidas Feminino Preto Confortável Casual"
"Calça Puma Unissex Cinza Moderna Esportiva"

REGRAS IMPORTANTES:
- NUNCA use hífens (-) no título
- Use apenas espaços para separar as palavras
- Mantenha a estrutura: CATEGORIA + MARCA + GÊNERO + COR + PALAVRAS SEO

FORMATO DE RESPOSTA (JSON):
{
  ${predefinedTitle ? `"title": "${predefinedTitle}",` : `"title": "título criativo e otimizado para busca (máximo 60 caracteres)",`}
  "clothing_type": "Tipo de roupa (ex: Camiseta, Camiseta Polo, Moletom, etc.)",
  "sleeve_type": "Tipo de manga (Curta, Longa, 3/4, Sem Mangas, Tomara que caia)",
  "gender": "Gênero (Masculino, Feminino, Meninos, Meninas, Bebês, Sem gênero, Sem gênero infantil)",
  "color": "Cor principal do produto (ex: Azul, Vermelho, Preto, Branco, etc.)",
  "modelo": "5 variações do nome do produto separadas por vírgula (ex: Camiseta Básica, Camiseta Casual, Camisa Dia a Dia, Camisa Lisa, Camisa para Trabalhar)"
}

IMPORTANTE: Responda APENAS em formato JSON válido com a estrutura especificada.`;

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
  // Metadados do produto
  clothing_type?: string;
  sleeve_type?: string;
  gender?: string;
  color?: string;
  modelo?: string;
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
      clothing_type,
      sleeve_type,
      gender,
      color,
      modelo
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