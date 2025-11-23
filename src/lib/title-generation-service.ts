import OpenAI from 'openai';

// Interface para elementos detectados do produto
interface ProductElements {
  productType: string;
  brand: string;
  model: string;
  characteristics: string[];
  color: string;
  targetAudience: string;
  isOfficial: boolean;
}

// Interface para título otimizado
interface OptimizedTitle {
  title: string;
  elements: ProductElements;
  confidence: number;
}

export class TitleGenerationService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Detecta automaticamente os elementos do produto usando IA
   */
  async detectProductElements(
    product: any,
    imageAnalysis: any,
    specifications: any[]
  ): Promise<ProductElements> {
    const systemPrompt = `Você é um especialista em análise de produtos para marketplace. Sua tarefa é detectar e extrair os elementos essenciais de um produto para criar títulos otimizados.

ELEMENTOS A DETECTAR:
1. Tipo de Produto: Camiseta, Boné, Jaqueta, Tênis, Moletom, Calça, Short, etc.
2. Marca: Nike, Adidas, NFL, NBA, Ecko, Onbongo, Lacoste, etc.
3. Modelo/Estilo: Slim Fit, Casual, Estampada, Polo, Streetwear, Canguru, etc.
4. Características: Algodão, Bordado, Manga Longa, Moletom Grosso, etc.
5. Cor: Preto, Branco, Azul, Vermelho, Verde, etc. (sempre no singular)
6. Público: Masculina, Feminina, Unissex, Juvenil, Infantil
7. Se é oficial/licenciado: true/false

REGRAS IMPORTANTES:
- Cor sempre no singular: "Preto", não "Pretos"
- Use informações reais do produto, não invente
- Se não souber algo, use termos genéricos apropriados
- Para cor, priorize a análise da imagem se disponível

Responda APENAS em formato JSON válido com a estrutura:
{
  "productType": "tipo do produto",
  "brand": "marca do produto",
  "model": "modelo ou estilo",
  "characteristics": ["característica1", "característica2"],
  "color": "cor principal",
  "targetAudience": "público-alvo",
  "isOfficial": true/false
}`;

    const userPrompt = `Analise este produto e extraia os elementos essenciais:

=== DADOS DO PRODUTO ===
Nome Original: ${product.name || 'N/A'}
Marca: ${product.brand_name || 'N/A'}
Categoria: ${product.category_name || 'N/A'}

=== ANÁLISE DA IMAGEM ===
${imageAnalysis ? imageAnalysis.contextualizacao || 'Nenhuma análise disponível' : 'Nenhuma análise de imagem disponível'}

=== ESPECIFICAÇÕES TÉCNICAS ===
${specifications.length > 0 ? specifications.map((spec, index) => `
${index + 1}. ${spec.field_name}: ${spec.field_value_ids || 'N/A'} ${spec.field_group_name ? `(Grupo: ${spec.field_group_name})` : ''}
`).join('') : 'Nenhuma especificação encontrada'}

Extraia os elementos essenciais seguindo as regras definidas.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia da OpenAI');
      }

      const elements = JSON.parse(content) as ProductElements;
      return elements;
    } catch (error) {
      console.error('Erro ao detectar elementos do produto:', error);
      // Fallback com dados básicos
      return {
        productType: this.extractProductType(product.name || ''),
        brand: product.brand_name || 'Genérico',
        model: 'Básico',
        characteristics: ['Padrão'],
        color: this.extractColor(product.name || ''),
        targetAudience: 'Unissex',
        isOfficial: false
      };
    }
  }

  /**
   * Gera título otimizado seguindo a estrutura ideal para marketplace
   */
  async generateOptimizedTitle(
    elements: ProductElements,
    product: any,
    maxAttempts: number = 3
  ): Promise<OptimizedTitle> {
    const systemPrompt = `Você é um ESPECIALISTA em SEO e marketing para marketplace, focado na criação de títulos PERFEITOS que maximizem a visibilidade e conversão.

📌 ESTRUTURA OBRIGATÓRIA IDEAL:
[TIPO DE PRODUTO] + [MARCA OU LICENÇA] + [MODELO/ESTILO] + [CARACTERÍSTICA PRINCIPAL] + [COR] + [PÚBLICO]

📐 REGRAS CRÍTICAS (NUNCA QUEBRAR):
1. MÁXIMO 60 caracteres (LIMITE ABSOLUTO - TÍTULOS MAIORES SERÃO REJEITADOS)
2. SEMPRE incluir: Tipo + Marca + Modelo + Característica + Cor + Público
3. Ordem importa: termo mais buscado vem primeiro
4. Cor sempre no singular: "Preto", "Branco", "Vermelho"
5. NUNCA usar hífens (-) no título
6. SEM palavras promocionais proibidas: "Top", "Promoção", "Mais Barata", "Frete Grátis"
7. SEM repetições desnecessárias
8. Otimizar para filtros da plataforma
9. NUNCA cortar ou truncar palavras - use sinônimos mais curtos se necessário
10. Se não couber em 60 chars, priorize: Tipo + Marca + Público + Cor

✅ EXEMPLOS PERFEITOS COM CONTAGEM:
- "Camiseta NFL Masculina Estampada Bordô Original" (47 chars) ✓
- "Boné Ecko Aba Curva Preto Snapback Unissex" (42 chars) ✓
- "Moletom Onbongo Canguru Masculino Cinza Casual" (45 chars) ✓
- "Tênis Nike Air Max Masculino Preto Branco" (38 chars) ✓
- "Jaqueta Adidas Feminina Preta Esportiva" (36 chars) ✓

❌ EXEMPLOS RUINS (MUITO LONGOS):
- "Camiseta Nike Masculina Estampada Bordô Original Oficial Premium" (58 chars - muito próximo do limite)
- "Boné Ecko Aba Curva Preto Snapback Unissex Original Premium" (55 chars - muito próximo do limite)

🚀 DICAS AVANÇADAS PARA ECONOMIZAR CARACTERES:
- Use "Camiseta" em vez de "Camiseta de Algodão"
- Use "Boné" em vez de "Boné de Baseball"
- Use "Tênis" em vez de "Tênis Esportivo"
- Use "Moletom" em vez de "Moletom com Capuz"
- Use "Unissex" em vez de "Masculino e Feminino"
- Se oficial/licenciado, use "Original" (8 chars) em vez de "Oficial" (7 chars)
- Use cores simples: "Preto", "Branco", "Azul" em vez de "Preto Clássico", "Branco Puro"

🎯 PRIORIDADE DE ELEMENTOS (se não couber tudo):
1. Tipo de Produto (obrigatório)
2. Marca (obrigatório se conhecida)
3. Público (obrigatório)
4. Cor (obrigatório)
5. Característica (se couber)
6. Modelo/Estilo (se couber)

Responda APENAS com o título otimizado, sem explicações.`;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const userPrompt = `Crie um título perfeito para marketplace usando estes elementos:

=== ELEMENTOS DETECTADOS ===
Tipo de Produto: ${elements.productType}
Marca: ${elements.brand}
Modelo/Estilo: ${elements.model}
Características: ${elements.characteristics.join(', ')}
Cor: ${elements.color}
Público: ${elements.targetAudience}
É Oficial: ${elements.isOfficial ? 'Sim' : 'Não'}

=== DADOS ADICIONAIS ===
Nome Original: ${product.name || 'N/A'}
Categoria: ${product.category_name || 'N/A'}

=== INSTRUÇÕES CRÍTICAS ===
- Siga EXATAMENTE a estrutura: [TIPO] + [MARCA] + [MODELO] + [CARACTERÍSTICA] + [COR] + [PÚBLICO]
- MÁXIMO 60 CARACTERES (LIMITE ABSOLUTO - TÍTULOS MAIORES SERÃO REJEITADOS)
- Sem hífens (-)
- Se for oficial, incluir "Original" ou "Oficial"
- NUNCA cortar ou truncar palavras - use sinônimos mais curtos se necessário
- Se não couber em 60 chars, priorize: Tipo + Marca + Público + Cor
- Tentativa ${attempt} de ${maxAttempts} - seja criativo e único!

IMPORTANTE: Conte mentalmente os caracteres antes de responder. O título deve ter EXATAMENTE 60 caracteres ou menos.

Título:`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3 + (attempt * 0.1), // Aumenta criatividade a cada tentativa
          max_tokens: 100,
        });

        const title = response.choices[0]?.message?.content?.trim();
        if (!title) {
          throw new Error('Título vazio gerado');
        }

        // Validar título
        const validation = this.validateTitle(title);
        if (validation.isValid) {
          return {
            title: title,
            elements: elements,
            confidence: validation.confidence
          };
        }

        console.log(`Tentativa ${attempt} falhou na validação:`, validation.errors);
      } catch (error) {
        console.error(`Erro na tentativa ${attempt}:`, error);
      }
    }

    // Fallback se todas as tentativas falharem
    const fallbackTitle = this.generateFallbackTitle(elements);
    return {
      title: fallbackTitle,
      elements: elements,
      confidence: 0.5
    };
  }

  /**
   * Valida se o título segue as regras do marketplace
   */
  private validateTitle(title: string): { isValid: boolean; confidence: number; errors: string[] } {
    const errors: string[] = [];
    let confidence = 1.0;

    // Verificar tamanho - CRÍTICO: deve ser exatamente 60 ou menos
    if (title.length > 60) {
      errors.push(`Título muito longo: ${title.length} caracteres (máximo 60) - REJEITADO`);
      confidence = 0; // Falha crítica
      return { isValid: false, confidence, errors };
    }

    // Verificar se está muito próximo do limite (aviso)
    if (title.length > 55) {
      errors.push(`Título próximo do limite: ${title.length} caracteres (recomendado máximo 55)`);
      confidence -= 0.1;
    }

    // Verificar hífens
    if (title.includes('-')) {
      errors.push('Título contém hífens (não permitido)');
      confidence -= 0.2;
    }

    // Verificar palavras proibidas
    const forbiddenWords = ['Top', 'Promoção', 'Mais Barata', 'Frete Grátis', 'Oferta', 'Liquidação', 'Desconto', 'Grátis'];
    const hasForbiddenWord = forbiddenWords.some(word => 
      title.toLowerCase().includes(word.toLowerCase())
    );
    if (hasForbiddenWord) {
      errors.push('Título contém palavras promocionais proibidas');
      confidence -= 0.4;
    }

    // Verificar se há palavras cortadas (terminam com hífen ou são muito curtas)
    const words = title.split(' ');
    const suspiciousWords = words.filter(word => 
      word.length < 2 || 
      word.endsWith('-') || 
      word.startsWith('-') ||
      /^[A-Z]{1,2}$/.test(word) // Palavras muito curtas em maiúscula
    );
    if (suspiciousWords.length > 0) {
      errors.push(`Possíveis palavras cortadas detectadas: ${suspiciousWords.join(', ')}`);
      confidence -= 0.3;
    }

    // Verificar elementos essenciais (opcionais - não são mais obrigatórios)
    const hasProductType = /camiseta|boné|jaqueta|tênis|moletom|calça|short|blusa|polo|regata/i.test(title);
    const hasBrand = /nike|adidas|nfl|nba|ecko|onbongo|lacoste|puma|reebok|converse/i.test(title);
    const hasColor = /preto|branco|azul|vermelho|verde|amarelo|rosa|cinza|marrom|bordô|roxo|laranja/i.test(title);
    const hasAudience = /masculin|feminin|unissex|juvenil|infantil/i.test(title);

    // Removidas as validações obrigatórias - agora são apenas informativas
    if (!hasProductType) {
      // Apenas log, não adiciona erro
      console.log('Aviso: Título não contém tipo de produto claro');
    }
    if (!hasBrand) {
      // Apenas log, não adiciona erro
      console.log('Aviso: Título não contém marca identificável');
    }
    if (!hasColor) {
      // Apenas log, não adiciona erro
      console.log('Aviso: Título não contém cor');
    }
    if (!hasAudience) {
      // Apenas log, não adiciona erro
      console.log('Aviso: Título não contém público-alvo');
    }

    // Verificar se o título tem pelo menos 20 caracteres (muito curto pode ser problemático)
    if (title.length < 20) {
      errors.push(`Título muito curto: ${title.length} caracteres (mínimo recomendado 20)`);
      confidence -= 0.1;
    }

    return {
      isValid: errors.length === 0,
      confidence: Math.max(0, confidence),
      errors: errors
    };
  }

  /**
   * Gera título de fallback caso a IA falhe
   */
  private generateFallbackTitle(elements: ProductElements): string {
    const parts = [
      elements.productType,
      elements.brand,
      elements.targetAudience,
      elements.color
    ];

    if (elements.isOfficial) {
      parts.push('Original');
    }

    const title = parts.join(' ');
    
    // Se o título for muito longo, trunca de forma inteligente
    if (title.length > 60) {
      return this.truncateTitleIntelligently(title, 60);
    }

    return title;
  }

  /**
   * Trunca título de forma inteligente, removendo palavras menos importantes
   */
  private truncateTitleIntelligently(title: string, maxLength: number): string {
    if (title.length <= maxLength) {
      return title;
    }

    const words = title.split(' ');
    const priorityWords = ['camiseta', 'boné', 'jaqueta', 'tênis', 'moletom', 'calça', 'short', 'blusa', 'polo'];
    const brandWords = ['nike', 'adidas', 'nfl', 'nba', 'ecko', 'onbongo', 'lacoste', 'puma', 'reebok'];
    const audienceWords = ['masculino', 'feminino', 'unissex', 'juvenil', 'infantil'];
    const colorWords = ['preto', 'branco', 'azul', 'vermelho', 'verde', 'amarelo', 'rosa', 'cinza', 'marrom', 'bordô'];

    // Priorizar palavras importantes
    const importantWords = [];
    const otherWords = [];

    for (const word of words) {
      const lowerWord = word.toLowerCase();
      if (priorityWords.includes(lowerWord) || 
          brandWords.includes(lowerWord) || 
          audienceWords.includes(lowerWord) || 
          colorWords.includes(lowerWord)) {
        importantWords.push(word);
      } else {
        otherWords.push(word);
      }
    }

    // Construir título priorizando palavras importantes
    let result = importantWords.join(' ');
    
    // Adicionar outras palavras se couber
    for (const word of otherWords) {
      const testTitle = result + ' ' + word;
      if (testTitle.length <= maxLength) {
        result = testTitle;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Extrai tipo de produto do nome (fallback)
   */
  private extractProductType(name: string): string {
    const types = ['Camiseta', 'Boné', 'Jaqueta', 'Tênis', 'Moletom', 'Calça', 'Short', 'Blusa'];
    const lowerName = name.toLowerCase();
    
    for (const type of types) {
      if (lowerName.includes(type.toLowerCase())) {
        return type;
      }
    }
    
    return 'Produto';
  }

  /**
   * Extrai cor do nome (fallback)
   */
  private extractColor(name: string): string {
    const colors = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom'];
    const lowerName = name.toLowerCase();
    
    for (const color of colors) {
      if (lowerName.includes(color.toLowerCase())) {
        return color;
      }
    }
    
    return 'Colorido';
  }
}
