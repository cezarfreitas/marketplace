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
1. MÁXIMO 60 caracteres
2. SEMPRE incluir: Tipo + Marca + Modelo + Característica + Cor + Público
3. Ordem importa: termo mais buscado vem primeiro
4. Cor sempre no singular: "Preto", "Branco", "Vermelho"
5. NUNCA usar hífens (-) no título
6. SEM palavras promocionais proibidas: "Top", "Promoção", "Mais Barata", "Frete Grátis"
7. SEM repetições desnecessárias
8. Otimizar para filtros da plataforma

✅ EXEMPLOS PERFEITOS:
- "Camiseta NFL Masculina Estampada Bordô Original Oficial"
- "Boné Ecko Aba Curva Preto Snapback Unissex Original"
- "Moletom Onbongo Canguru Masculino Cinza Mescla Casual"
- "Tênis Nike Air Max Masculino Preto e Branco Original"

🚀 DICAS AVANÇADAS:
- Se oficial/licenciado, SEMPRE incluir "Original" ou "Oficial"
- Use características específicas que diferenciem o produto
- Mantenha clareza e objetividade
- Foque em palavras-chave que as pessoas realmente buscam

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

=== INSTRUÇÕES ===
- Siga EXATAMENTE a estrutura: [TIPO] + [MARCA] + [MODELO] + [CARACTERÍSTICA] + [COR] + [PÚBLICO]
- Máximo 60 caracteres
- Sem hífens
- Se for oficial, incluir "Original" ou "Oficial"
- Tentativa ${attempt} de ${maxAttempts} - seja criativo e único!

Título:`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
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

    // Verificar tamanho
    if (title.length > 60) {
      errors.push(`Título muito longo: ${title.length} caracteres (máximo 60)`);
      confidence -= 0.3;
    }

    // Verificar hífens
    if (title.includes('-')) {
      errors.push('Título contém hífens (não permitido)');
      confidence -= 0.2;
    }

    // Verificar palavras proibidas
    const forbiddenWords = ['Top', 'Promoção', 'Mais Barata', 'Frete Grátis', 'Oferta', 'Liquidação'];
    const hasForbiddenWord = forbiddenWords.some(word => 
      title.toLowerCase().includes(word.toLowerCase())
    );
    if (hasForbiddenWord) {
      errors.push('Título contém palavras promocionais proibidas');
      confidence -= 0.4;
    }

    // Verificar elementos essenciais
    const hasProductType = /camiseta|boné|jaqueta|tênis|moletom|calça|short|blusa/i.test(title);
    const hasBrand = /nike|adidas|nfl|nba|ecko|onbongo|lacoste/i.test(title);
    const hasColor = /preto|branco|azul|vermelho|verde|amarelo|rosa|cinza|marrom/i.test(title);
    const hasAudience = /masculin|feminin|unissex|juvenil|infantil/i.test(title);

    if (!hasProductType) {
      errors.push('Título não contém tipo de produto claro');
      confidence -= 0.2;
    }
    if (!hasBrand) {
      errors.push('Título não contém marca identificável');
      confidence -= 0.1;
    }
    if (!hasColor) {
      errors.push('Título não contém cor');
      confidence -= 0.2;
    }
    if (!hasAudience) {
      errors.push('Título não contém público-alvo');
      confidence -= 0.2;
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

    return parts.join(' ').substring(0, 60);
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
