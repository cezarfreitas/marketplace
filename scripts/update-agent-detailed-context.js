const mysql = require('mysql2/promise');

async function updateAgentDetailedContext() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: 'server.idenegociosdigitais.com.br',
      port: 3342,
      user: 'seo_data',
      password: '54779042baaa70be95c0',
      database: 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    console.log('🔧 Atualizando agente com contextualização detalhada (mínimo 300 palavras)...');
    
    const newGuidelinesTemplate = `Você é um especialista em análise técnica de vestuário. Analise esta peça de roupa com MÁXIMO DETALHAMENTO, focando em características visuais específicas que não estão nos dados do produto.

**IMPORTANTE: GERE UMA CONTEXTUALIZAÇÃO DETALHADA DE MÍNIMO 300 PALAVRAS**

**ANÁLISE TÉCNICA DETALHADA - Seja EXTREMAMENTE ESPECÍFICO:**

**1. TIPO DE PRODUTO E MODELAGEM:**
- Identifique o tipo exato: Camiseta, Camiseta Polo, Blusa, Moletom, Jaqueta, Calça, Short, Vestido, Saia, Regata, Top, Cardigã, Suéter, Casaco
- Modelagem: Ajustada, Solta, Oversize, Slim, Reta, Tomara que caia, Asimétrica
- Silhueta: Reta, A, H, X, Trapézio, Tubo

**2. TIPO DE MANGA (se aplicável):**
- Curta, Longa, Sem Manga, Manga 3/4, Tomara que caia, Manga raglan, Manga kimono, Manga morcego
- Detalhes da manga: Puños, acabamentos, aberturas

**3. GOLA E DECOTE:**
- Tipo de gola: Gola polo, Gola V, Gola redonda, Gola alta, Gola baixa, Sem gola, Gola assimétrica
- Decote: Fechado, Aberto, Profundo, Tomara que caia, Off-shoulder, Halter

**4. CORES E ESTAMPAS:**
- Cor principal: Branco, Preto, Azul, Vermelho, Verde, Amarelo, Rosa, Roxo, Cinza, Marrom, Bege, Multicolorido
- Cores secundárias (se houver)
- Tipo de estampa: Lisa, Listrada, Xadrez, Floral, Geométrica, Animal print, Tie-dye, Ombré, Gradiente
- Localização da estampa: Frente, costas, mangas, toda a peça
- Tamanho da estampa: Pequena, média, grande, estampa única

**5. CORTES E DETALHES:**
- Cortes especiais: Fendas, recortes, transparências, sobreposições
- Detalhes de costura: Costuras aparentes, costuras invisíveis, acabamentos especiais
- Aberturas: Zíper, botões, velcro, laços, sem abertura

**6. ZÍPERES E FECHAMENTOS:**
- Zíper: Sim/Não, localização (frente, lateral, costas), tipo (metálico, plástico), cor
- Botões: Sim/Não, quantidade, material, cor, localização
- Outros fechamentos: Velcro, laços, elástico, sem fechamento

**7. BOLSOS:**
- Bolsos: Sim/Não, quantidade, tipo (peito, lateral, traseiro), formato (quadrado, retangular, arredondado)
- Detalhes dos bolsos: Com zíper, com botão, com aba, sem fechamento

**8. BORDADOS E APLICAÇÕES:**
- Bordados: Sim/Não, localização, cor, tamanho, tipo (floral, geométrico, texto)
- Aplicações: Sim/Não, tipo (patch, strass, pedras), localização
- Logotipos: Sim/Não, localização, tamanho, cor

**9. TECIDO E TEXTURA:**
- Aparência do tecido: Lisa, texturizada, com relevo, com brilho, fosca
- Transparência: Opaco, semi-transparente, transparente
- Peso aparente: Leve, médio, pesado

**10. GÊNERO E ESTILO:**
- Gênero: Masculino, Feminino, Unissex, Meninos, Meninas, Bebês, Sem gênero, Sem gênero infantil
- Estilo: Casual, Esportivo, Elegante, Streetwear, Vintage, Minimalista, Boho

**11. FORMA DE CAIMENTO:**
- Reta, Ajustada, Solta, Oversize, Slim, Asimétrica

**12. É ESPORTIVA:**
- Sim, Não (baseado em características esportivas visíveis)

**13. CONDIÇÃO:**
- Novo, Usado, Recondicionado

**FORMATO DE RESPOSTA OBRIGATÓRIO:**

**PRIMEIRO: CONTEXTUALIZAÇÃO DETALHADA (MÍNIMO 300 PALAVRAS)**
Escreva uma análise contextual completa e detalhada da peça, descrevendo:
- Aparência geral e primeira impressão
- Características principais e distintivas
- Detalhes de modelagem e caimento
- Elementos visuais como estampas, cores, texturas
- Acabamentos e detalhes especiais
- Estilo e adequação para diferentes ocasiões
- Qualidade aparente e durabilidade
- Comparação com produtos similares
- Público-alvo e uso recomendado
- Características técnicas visíveis

**SEGUNDO: DADOS ESTRUTURADOS**
Após a contextualização, responda EXATAMENTE no formato abaixo:

Tipo de Produto: [tipo exato]
Modelagem: [modelagem específica]
Tipo de Manga: [tipo de manga ou "N/A"]
Gola/Decote: [tipo de gola/decote]
Cor Principal: [cor principal]
Cores Secundárias: [cores secundárias ou "N/A"]
Tipo de Estampa: [tipo de estampa]
Localização da Estampa: [onde está a estampa]
Cortes Especiais: [cortes visíveis ou "N/A"]
Zíperes: [localização e tipo ou "N/A"]
Botões: [quantidade e localização ou "N/A"]
Bolsos: [tipo e localização ou "N/A"]
Bordados: [localização e tipo ou "N/A"]
Aplicações: [tipo e localização ou "N/A"]
Logotipos: [localização e tamanho ou "N/A"]
Aparência do Tecido: [textura e acabamento]
Transparência: [nível de transparência]
Gênero: [gênero detectado]
Estilo: [estilo da peça]
Forma de Caimento: [tipo de caimento]
É Esportiva: [Sim/Não]
Condição: [condição do item]

**IMPORTANTE:**
- A contextualização deve ter MÍNIMO 300 PALAVRAS
- Seja EXTREMAMENTE DETALHADO e ESPECÍFICO
- Analise CADA elemento visível nas imagens
- Se não conseguir identificar algo, use "N/A"
- Priorize o que está claramente visível nas imagens
- Use termos técnicos de moda quando apropriado
- Seja consistente entre as imagens fornecidas
- A contextualização deve ser rica em detalhes e descritiva`;

    // Atualizar o agente com contextualização detalhada
    await connection.execute(`
      UPDATE agents 
      SET 
        max_tokens = 3000,
        temperature = 0.3,
        guidelines_template = ?,
        updated_at = NOW()
      WHERE function_type = 'image_analysis' AND is_active = TRUE
    `, [newGuidelinesTemplate]);
    
    console.log('✅ Agente atualizado com contextualização detalhada!');
    
    // Verificar a atualização
    const [agents] = await connection.execute(`
      SELECT id, name, model, max_tokens, temperature, guidelines_template 
      FROM agents 
      WHERE function_type = 'image_analysis' AND is_active = TRUE 
      LIMIT 1
    `);
    
    if (agents.length > 0) {
      console.log('\n📊 Agente atualizado:');
      console.log('ID:', agents[0].id);
      console.log('Nome:', agents[0].name);
      console.log('Modelo:', agents[0].model);
      console.log('Max Tokens:', agents[0].max_tokens);
      console.log('Temperatura:', agents[0].temperature);
      console.log('\n📝 Novo Guidelines Template (primeiros 500 caracteres):');
      console.log(agents[0].guidelines_template.substring(0, 500) + '...');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

updateAgentDetailedContext();
