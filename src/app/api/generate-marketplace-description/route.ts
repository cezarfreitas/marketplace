import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// Função para verificar se título já existe no banco
async function checkTitleExists(title: string, productId: number): Promise<boolean> {
  try {
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM meli 
      WHERE title = ? AND product_id != ?
    `;
    const result = await executeQuery(checkQuery, [title, productId]);
    return (result[0] as any).count > 0;
  } catch (error) {
    console.log('⚠️ Erro ao verificar duplicata de título:', error);
    return false;
  }
}

// Função para gerar título único
async function generateUniqueTitle(baseTitle: string, productId: number, maxAttempts: number = 5): Promise<string> {
  let title = baseTitle;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const exists = await checkTitleExists(title, productId);
    if (!exists) {
      return title;
    }
    
    // Se título existe, adicionar sufixo numérico
    attempts++;
    title = `${baseTitle} ${attempts}`;
  }
  
  // Se não conseguir gerar título único, retornar com timestamp
  return `${baseTitle} ${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
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
    console.log('🔍 Buscando dados do produto...');
    let products;
    try {
      const productQuery = `
        SELECT 
          p.*,
          b.name as brand_name,
          c.name as category_name
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories c ON p.category_id = c.id
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

    // 2. Buscar análise de imagens mais recente
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
        const existingQuery = `SELECT * FROM meli WHERE product_id = ?`;
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

    // 4. Gerar descrição usando OpenAI
    console.log('🤖 Chamando OpenAI...');
    const openaiResponse = await generateMeliDescriptionWithOpenAI(product, imageAnalysis, numericProductId);
    console.log('🤖 Resposta da OpenAI:', openaiResponse.success ? 'Sucesso' : 'Erro');
    
    if (!openaiResponse.success) {
      console.log('❌ Erro na OpenAI:', openaiResponse.error);
      return NextResponse.json({
        success: false,
        message: openaiResponse.error || 'Erro ao gerar descrição com IA'
      }, { status: 500 });
    }

    const { title, description, clothing_type, sleeve_type, gender, color, modelo, seller_sku, wedge_shape, is_sportive, main_color, item_condition, brand, tokensUsed } = openaiResponse.data || {};
    console.log('📝 Dados gerados:', { title: title?.substring(0, 50) + '...', description: description?.substring(0, 50) + '...' });

    // 5. Salvar no banco de dados
    console.log('💾 Salvando no banco de dados...');
    let saveResult;
    try {
      saveResult = await saveMeliDescription({
        productId: numericProductId,
        title,
        description,
        clothing_type,
        sleeve_type,
        gender,
        color,
        modelo,
        seller_sku,
        wedge_shape,
        is_sportive,
        main_color,
        item_condition,
        brand,
        tokensUsed,
        agentUsed: 'Agente Marketplace',
        modelUsed: 'gpt-4o-mini'
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

    console.log('✅ Descrição do Marketplace gerada com sucesso!');
    return NextResponse.json({
      success: true,
      data: {
        ...saveResult.data,
        title,
        description,
        clothing_type,
        sleeve_type,
        gender,
        color,
        modelo,
        seller_sku,
        wedge_shape,
        is_sportive,
        main_color,
        item_condition,
        brand,
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

async function generateMeliDescriptionWithOpenAI(product: any, imageAnalysis: any, productId: number) {
  try {
    console.log('🤖 Iniciando geração com OpenAI...');
    console.log('📦 Produto:', product.name);
    console.log('🖼️ Análise de imagem:', imageAnalysis ? 'Disponível' : 'Não disponível');
    
    // Buscar chave da OpenAI das configurações do banco
    console.log('🔍 Buscando chave da OpenAI...');
    let settings;
    try {
      settings = await executeQuery(`
        SELECT config_value 
        FROM system_config 
        WHERE config_key = 'openai_api_key'
      `);
      console.log('📊 Configurações encontradas:', settings?.length || 0);
    } catch (dbError) {
      console.error('❌ Erro ao buscar configuração da OpenAI:', dbError);
      throw new Error('Erro ao acessar configurações do banco de dados');
    }

    if (!settings || settings.length === 0) {
      console.log('⚠️ Chave da OpenAI não configurada no banco');
      throw new Error('Chave da API OpenAI não configurada. Configure em Configurações > IA.');
    }

    const openaiApiKey = settings[0].config_value;
    console.log('🔑 Chave da API OpenAI:', openaiApiKey ? 'Configurada' : 'NÃO CONFIGURADA');
    
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      console.log('⚠️ Chave da OpenAI está vazia');
      throw new Error('Chave da API OpenAI está vazia. Configure em Configurações > IA.');
    }

    console.log('✅ Chave da OpenAI encontrada, continuando...');

    // Construir prompt para o Marketplace
    const systemPrompt = `Você é um especialista em e-commerce e marketing digital, focado especificamente no Marketplace. Sua tarefa é criar títulos e descrições otimizadas para produtos de moda e vestuário que maximizem a visibilidade e conversão no Marketplace.

REGRAS IMPORTANTES:
1. Título deve ter MÁXIMO 60 caracteres (limite obrigatório do Marketplace)
2. Descrição deve ter MÍNIMO 350 palavras, estruturada e detalhada
3. Use palavras-chave relevantes para SEO
4. Inclua informações técnicas e de qualidade
5. Seja persuasivo mas honesto
6. Foque nos benefícios para o cliente
7. Use linguagem clara e direta
8. Estruture a descrição com seções organizadas
9. USE TAGS HTML BÁSICAS para formatação: <br> para quebras de linha, <b> para negrito, <li> para listas
10. OBRIGATÓRIO: A descrição deve ter pelo menos 350 palavras para garantir qualidade e SEO
11. NUNCA AFIRME materiais específicos (como "100% algodão", "poliéster", etc.) sem ter certeza absoluta
12. Use termos genéricos como "material de qualidade", "tecido selecionado", "composição premium" quando não souber o material exato

ESTRUTURA DA DESCRIÇÃO (MÍNIMO 350 PALAVRAS):
- Parágrafo introdutório detalhado sobre o produto (50-80 palavras)
- Informações sobre a marca e qualidade (40-60 palavras)
- Detalhes técnicos e materiais (60-80 palavras)
- Benefícios e características (50-70 palavras)
- Seção "Destaques do produto" com 5-7 bullet points (60-80 palavras)
- Seção "Material e cuidados" detalhada (40-60 palavras)
- Seção "Por que escolher" com 4-5 vantagens (50-70 palavras)
- Seção "FAQ - Perguntas frequentes" com 5-6 perguntas completas (80-100 palavras)
- Call-to-action final (20-30 palavras)

FORMATO DE RESPOSTA (JSON):
{
  "title": "título otimizado",
  "description": "descrição completa estruturada",
  "clothing_type": "Tipo de roupa (ex: Camiseta, Camiseta Polo, Moletom, etc.)",
  "sleeve_type": "Tipo de manga (Curta, Longa, 3/4, Sem Mangas, Tomara que caia)",
  "gender": "Gênero (Masculino, Feminino, Meninos, Meninas, Bebês, Sem gênero, Sem gênero infantil)",
  "color": "Cor principal do produto (ex: Azul, Vermelho, Preto, Branco, etc.)",
  "modelo": "5 variações do nome do produto separadas por vírgula (ex: Camiseta Básica, Camiseta Casual, Camisa Dia a Dia, Camisa Lisa, Camisa para Trabalhar)",
  "seller_sku": "SKU do vendedor (usar o ref_id do produto)",
  "wedge_shape": "Forma de caimento (Oversize, Larga, Slim, Reta)",
  "is_sportive": "É esportiva (Sim, Não)",
  "main_color": "Cor principal do produto (ex: Azul, Vermelho, Preto, Branco, etc.)",
  "item_condition": "Condição do item (Novo, Usado, Recondicionado)",
  "brand": "Nome da marca do produto"
}`;

    const userPrompt = `Crie uma descrição otimizada para o Marketplace para este produto:

PRODUTO ORIGINAL: ${product.name}
REF_ID: ${product.ref_id || 'N/A'}
MARCA: ${product.brand_name || 'N/A'}
CATEGORIA: ${product.category_name || 'N/A'}
DESCRIÇÃO ATUAL: ${product.description || 'N/A'}
TÍTULO ATUAL: ${product.title || 'N/A'}

${imageAnalysis ? `
ANÁLISE TÉCNICA DAS IMAGENS:
${imageAnalysis.contextual_analysis}
` : ''}

INSTRUÇÕES CRÍTICAS: 
- Crie um NOVO TÍTULO otimizado (não use o nome original do produto)
- OBRIGATÓRIO: O título DEVE sempre incluir: CATEGORIA + MARCA + GÊNERO + COR
- OBRIGATÓRIO: O título DEVE sempre incluir o gênero: "Masculino", "Feminino" ou "Unissex"
- OBRIGATÓRIO: O título DEVE sempre incluir a marca do produto
- OBRIGATÓRIO: O título DEVE sempre incluir a categoria do produto
- OBRIGATÓRIO: O título DEVE sempre incluir a cor detectada
- Na descrição, use EXCLUSIVAMENTE o NOVO TÍTULO que você criou, NUNCA o nome original
- O novo título deve ser mais atrativo e otimizado para SEO
- TODA a descrição deve referenciar o produto pelo novo título otimizado

ESTRUTURA OBRIGATÓRIA DA DESCRIÇÃO:
1. Parágrafo introdutório sobre o produto (use o novo título)
2. Informações sobre a marca e qualidade
3. Detalhes técnicos e materiais
4. Benefícios e características
5. Seção "Destaques do produto" com bullet points
6. Seção "Material e cuidados"
7. Seção "Por que escolher" com vantagens
8. Seção "FAQ - Perguntas frequentes" com 4-5 perguntas
9. Call-to-action final

EXEMPLOS DE COMO MELHORAR O CONTEÚDO (APENAS SUGESTÕES):

Exemplo 1 - Títulos com gênero obrigatório:
- Para produtos masculinos: "[Nome do Produto] Masculino - [Características]"
- Para produtos femininos: "[Nome do Produto] Feminino - [Características]"  
- Para produtos unissex: "[Nome do Produto] Unissex - [Características]"

Exemplo 2 - Introdução mais envolvente:
"Descubra o <b>[Novo Título]</b>, uma peça essencial para quem busca [benefício principal]. Imagine-se [situação de uso específica] com total conforto e estilo. Este produto foi pensado para [público-alvo] que valoriza [características importantes]."

Exemplo 2 - Storytelling da marca:
"A <b>[Marca]</b> nasceu da paixão por [história da marca]. Cada produto carrega nossa missão de [valores da marca]. Quando você escolhe [Marca], está escolhendo [benefício da escolha da marca]."

Exemplo 3 - Destaques mais persuasivos:
"<b>O que torna este produto especial:</b><br>
<li><b>Design inteligente:</b> [explicação detalhada do design]</li>
<li><b>Conforto garantido:</b> [explicação do conforto]</li>
<li><b>Durabilidade excepcional:</b> [explicação da durabilidade]</li>
<li><b>Versatilidade única:</b> [explicação da versatilidade]</li>"

Exemplo 3b - Como falar sobre materiais sem afirmar:
"<b>Qualidade e conforto:</b><br>
<li><b>Material selecionado:</b> Tecido de alta qualidade que oferece [benefícios]</li>
<li><b>Composição premium:</b> Material cuidadosamente escolhido para [propósito]</li>
<li><b>Acabamento refinado:</b> Detalhes que garantem [benefícios específicos]</li>"

Exemplo 4 - FAQ mais humanizado:
"<b>Dúvidas frequentes:</b><br>
<b>Este produto é adequado para [situação específica]?</b><br>
Sim! O [Novo Título] foi desenvolvido pensando em [situação específica]. [Explicação detalhada com benefícios].<br><br>

<b>Como posso ter certeza da qualidade?</b><br>
Nossa garantia de [tempo] cobre [cobertura da garantia]. Além disso, [argumentos de qualidade adicionais]."

Exemplo 5 - Call-to-action mais persuasivo:
"Não perca a oportunidade de ter o <b>[Novo Título]</b> em seu guarda-roupa. [Benefício imediato da compra]. [Urgência ou escassez]. Garanta o seu agora e [benefício adicional da compra]!"

INSTRUÇÕES DE FORMATAÇÃO HTML:
- Use <br> para quebras de linha (não use \n)
- Use <b>texto</b> para destacar palavras importantes
- Use <li>item</li> para criar listas (não use • ou -)
- Use <br><br> para separar parágrafos
- Mantenha o HTML simples e limpo

DETECÇÃO DE TIPO DE ROUPA:
- Analise o nome do produto para identificar o tipo de roupa
- Se contém "Polo" ou "polo" → "Camiseta Polo"
- Se contém "Camiseta" mas não "Polo" → "Camiseta"
- Se contém "Moletom" → "Moletom"
- Se contém "Calça" → "Calça"
- Se contém "Short" → "Short"
- Se contém "Jaqueta" → "Jaqueta"
- Se contém "Blusa" → "Blusa"
- Se contém "Vestido" → "Vestido"
- Se contém "Saia" → "Saia"
- Se não identificar, use o tipo mais genérico baseado no contexto

DETECÇÃO DE TIPO DE MANGA:
- Analise o nome do produto e descrição para identificar o tipo de manga
- Se contém "Manga Curta", "Curta", "Regata" → "Curta"
- Se contém "Manga Longa", "Longa", "Comprida" → "Longa"
- Se contém "3/4", "Três Quartos", "Meia Manga" → "3/4"
- Se contém "Sem Manga", "Sem Mangas", "Regata", "Tank Top" → "Sem Mangas"
- Se contém "Tomara que Caia", "Tomara que caia", "Off Shoulder" → "Tomara que caia"
- Se não identificar, use "Curta" como padrão para camisetas e "Longa" para blusas/jaquetas

DETECÇÃO DE GÊNERO:
- Analise o nome do produto e descrição para identificar o gênero
- Se contém "Masculina", "Masculino", "Homem", "Men" → "Masculino"
- Se contém "Feminina", "Feminino", "Mulher", "Woman", "Lady" → "Feminino"
- Se contém "Meninos", "Boy", "Boys" → "Meninos"
- Se contém "Meninas", "Girl", "Girls" → "Meninas"
- Se contém "Bebê", "Bebês", "Baby", "Infantil" (para bebês) → "Bebês"
- Se contém "Unissex", "Uni", "Neutro" → "Sem gênero"
- Se contém "Infantil" (para crianças) → "Sem gênero infantil"
- Se não identificar, use "Sem gênero" como padrão

DETECÇÃO DE COR:
- Analise o nome do produto e descrição para identificar a cor principal
- Procure por palavras como: Azul, Vermelho, Preto, Branco, Verde, Amarelo, Rosa, Roxo, Cinza, Marrom, Bege, etc.
- Se houver múltiplas cores, escolha a cor predominante
- Se não identificar cor específica, use "Multicolorido" ou a cor mais comum mencionada
- CRÍTICO: A cor detectada DEVE aparecer no título do produto
- A cor deve ser uma palavra simples e clara (ex: "Azul", "Preto", "Rosa")

ESTRUTURA OBRIGATÓRIA DO TÍTULO:
- O título DEVE OBRIGATORIAMENTE incluir: CATEGORIA + MARCA + GÊNERO + COR
- LIMITE CRÍTICO: MÁXIMO 60 caracteres (contar cada letra, espaço e símbolo)
- Formato: "[Nome do Produto] [Marca] [Categoria] [Gênero] [Cor] - [Características]"
- Exemplos (todos com menos de 60 caracteres):
  * "Camiseta Nike Masculino Azul - Conforto" (42 caracteres)
  * "Blusa Zara Feminino Rosa - Elegante" (35 caracteres)
  * "Moletom Adidas Unissex Preto - Casual" (37 caracteres)
- OBRIGATÓRIO: Sempre incluir a marca do produto no título
- OBRIGATÓRIO: Sempre incluir a categoria do produto no título
- OBRIGATÓRIO: Sempre incluir o gênero detectado: "Masculino", "Feminino" ou "Unissex"
- OBRIGATÓRIO: Sempre incluir a cor detectada no título
- OBRIGATÓRIO: Título deve ser ÚNICO e não duplicar títulos existentes
- O gênero no título deve corresponder exatamente ao campo "gender" detectado
- Se o gênero for "Masculino" → título deve conter "Masculino"
- Se o gênero for "Feminino" → título deve conter "Feminino"
- Se o gênero for "Sem gênero" → título deve conter "Unissex"

GERAÇÃO DE VARIAÇÕES DO NOME (CAMPO MODELO):
- Crie EXATAMENTE 5 variações do nome do produto separadas por vírgula
- Estas variações NÃO devem aparecer no título ou na descrição
- Use diferentes formas de chamar o mesmo produto
- Inclua variações que os clientes usariam para buscar o produto
- Exemplos de variações:
  * Para "Camiseta Básica": "Camiseta Casual, Camisa Dia a Dia, Camisa Lisa, Camisa para Trabalhar, Camiseta Simples"
  * Para "Blusa Elegante": "Blusa Social, Blusa para Festa, Blusa Feminina, Blusa Chique, Blusa Sofisticada"
  * Para "Moletom Confortável": "Moletom Casual, Moletom para Casa, Moletom Quentinho, Moletom Relax, Moletom Básico"
- Formato: "Variação 1, Variação 2, Variação 3, Variação 4, Variação 5"
- Exemplo: "Camiseta Básica, Camiseta Casual, Camisa Dia a Dia, Camisa Lisa, Camisa para Trabalhar"

DETECÇÃO DE FORMA DE CAIMENTO (CAMPO WEDGE_SHAPE):
- Analise o nome do produto e descrição para identificar a forma de caimento
- Se contém "Oversize", "Oversized", "Largo", "Folgado" → "Oversize"
- Se contém "Larga", "Wide", "Amplo" → "Larga"
- Se contém "Slim", "Ajustado", "Justo", "Colado" → "Slim"
- Se contém "Reta", "Reto", "Straight", "Clássico" → "Reta"
- Se não identificar, use "Reta" como padrão

DETECÇÃO DE PRODUTO ESPORTIVO (CAMPO IS_SPORTIVE):
- Analise o nome do produto e descrição para identificar se é esportivo
- Se contém "Esportiva", "Esportivo", "Sport", "Atlética", "Academia", "Treino", "Fitness", "Corrida", "Ciclismo" → "Sim"
- Se contém "Casual", "Social", "Elegante", "Formal", "Trabalho", "Escritório" → "Não"
- Se não identificar, use "Não" como padrão

DETECÇÃO DE COR PRINCIPAL (CAMPO MAIN_COLOR):
- Analise o nome do produto e descrição para identificar a cor principal
- Use a mesma lógica do campo "color" existente
- Se não identificar, use "Multicolorido"

DETECÇÃO DE CONDIÇÃO DO ITEM (CAMPO ITEM_CONDITION):
- Para produtos novos (padrão): "Novo"
- Se contém "Usado", "Seminovo", "Recondicionado" → usar a condição específica
- Padrão: "Novo"

DETECÇÃO DE MARCA (CAMPO BRAND):
- Use o nome da marca do produto (brand_name)
- Se não disponível, use "Marca Genérica"

CRIATIVIDADE E FLEXIBILIDADE:
- Use os exemplos acima como inspiração, não como regras rígidas
- Seja criativo na estrutura e abordagem
- Adapte o tom e estilo ao produto específico
- Varie a linguagem para evitar repetição
- Crie conexão emocional com o cliente
- Use storytelling quando apropriado
- Seja autêntico e persuasivo

CUIDADOS COM INFORMAÇÕES TÉCNICAS:
- NUNCA especifique materiais exatos (algodão, poliéster, etc.) sem certeza
- Use termos genéricos: "material de qualidade", "tecido selecionado", "composição premium"
- Foque nos BENEFÍCIOS do material, não na composição exata
- Se mencionar cuidados, seja genérico: "siga as instruções de lavagem do fabricante"
- Evite especificações técnicas que não pode confirmar

LEMBRE-SE: A descrição deve usar APENAS o novo título otimizado, NUNCA o nome original do produto.

Retorne APENAS o JSON com as informações solicitadas.`;

    console.log('🌐 Chamando API da OpenAI...');
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          max_tokens: 3000,
          temperature: 0.7,
          response_format: { type: 'json_object' }
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

    let data;
    try {
      data = await response.json();
      console.log('✅ Resposta da OpenAI recebida');
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
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('❌ Conteúdo que causou erro:', content);
      throw new Error('Resposta da OpenAI não é um JSON válido');
    }

    // Garantir que o título tenha no máximo 60 caracteres
    let finalTitle = parsedContent.title || 'Título não gerado';
    if (finalTitle.length > 60) {
      finalTitle = finalTitle.substring(0, 60);
      console.log('⚠️ Título truncado para 60 caracteres:', finalTitle);
    }

    // Gerar título único
    let uniqueTitle;
    try {
      uniqueTitle = await generateUniqueTitle(finalTitle, productId);
      console.log('🔍 Título único gerado:', uniqueTitle);
    } catch (titleError) {
      console.error('❌ Erro ao gerar título único:', titleError);
      // Usar título original se houver erro na verificação de duplicatas
      uniqueTitle = finalTitle;
    }

    return {
      success: true,
      data: {
        title: uniqueTitle,
        description: parsedContent.description || 'Descrição não gerada',
        clothing_type: parsedContent.clothing_type || 'Produto de Vestuário',
        sleeve_type: parsedContent.sleeve_type || 'Curta',
        gender: parsedContent.gender || 'Sem gênero',
        color: parsedContent.color || 'Multicolorido',
        modelo: parsedContent.modelo || 'Produto Básico, Produto Casual, Produto Simples, Produto Essencial, Produto Versátil',
        seller_sku: parsedContent.seller_sku || product.ref_id || 'N/A',
        wedge_shape: parsedContent.wedge_shape || 'Reta',
        is_sportive: parsedContent.is_sportive || 'Não',
        main_color: parsedContent.main_color || parsedContent.color || 'Multicolorido',
        item_condition: parsedContent.item_condition || 'Novo',
        brand: parsedContent.brand || product.brand_name || 'Marca Genérica',
        tokensUsed: data.usage?.total_tokens || 0
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

// Função para salvar descrição do Marketplace diretamente no banco
async function saveMeliDescription(data: {
  productId: number;
  title: string;
  description: string;
  clothing_type?: string;
  sleeve_type?: string;
  gender?: string;
  color?: string;
  modelo?: string;
  seller_sku?: string;
  wedge_shape?: string;
  is_sportive?: string;
  main_color?: string;
  item_condition?: string;
  brand?: string;
  agentUsed?: string;
  modelUsed?: string;
  tokensUsed?: number;
}) {
  try {
    const { 
      productId, 
      title, 
      description, 
      clothing_type,
      sleeve_type,
      gender,
      color,
      modelo,
      seller_sku,
      wedge_shape,
      is_sportive,
      main_color,
      item_condition,
      brand,
      agentUsed,
      modelUsed,
      tokensUsed
    } = data;

    // Verificar se a tabela meli existe, se não, criar
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS meli (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        clothing_type VARCHAR(100),
        sleeve_type VARCHAR(50),
        gender VARCHAR(50),
        color VARCHAR(100),
        modelo TEXT,
        seller_sku VARCHAR(255),
        wedge_shape VARCHAR(50),
        is_sportive VARCHAR(10),
        main_color VARCHAR(100),
        item_condition VARCHAR(50),
        brand VARCHAR(255),
        agent_used VARCHAR(100),
        model_used VARCHAR(100),
        tokens_used INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product_meli (product_id)
      )
    `;

    await executeQuery(createTableQuery, []);

    // Inserir ou atualizar descrição
    const insertQuery = `
      INSERT INTO meli (
        product_id, title, description, clothing_type, sleeve_type, gender, color, modelo,
        seller_sku, wedge_shape, is_sportive, main_color, item_condition, brand,
        agent_used, model_used, tokens_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        clothing_type = VALUES(clothing_type),
        sleeve_type = VALUES(sleeve_type),
        gender = VALUES(gender),
        color = VALUES(color),
        modelo = VALUES(modelo),
        seller_sku = VALUES(seller_sku),
        wedge_shape = VALUES(wedge_shape),
        is_sportive = VALUES(is_sportive),
        main_color = VALUES(main_color),
        item_condition = VALUES(item_condition),
        brand = VALUES(brand),
        agent_used = VALUES(agent_used),
        model_used = VALUES(model_used),
        tokens_used = VALUES(tokens_used),
        updated_at = CURRENT_TIMESTAMP,
        created_at = CASE 
          WHEN created_at IS NULL THEN CURRENT_TIMESTAMP 
          ELSE created_at 
        END
    `;

    const result = await executeQuery(insertQuery, [
      productId,
      title,
      description,
      clothing_type || null,
      sleeve_type || null,
      gender || null,
      color || null,
      modelo || null,
      seller_sku || null,
      wedge_shape || null,
      is_sportive || null,
      main_color || null,
      item_condition || null,
      brand || null,
      agentUsed || null,
      modelUsed || null,
      tokensUsed || 0
    ]);

    console.log('✅ Descrição do Marketplace salva para produto ID:', productId);

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