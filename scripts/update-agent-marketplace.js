const mysql = require('mysql2/promise');

async function updateAgentMarketplace() {
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

    console.log('🔧 Atualizando agente com prompt para marketplace...');
    
    const newGuidelinesTemplate = `Analise esta peça de vestuário e extraia as seguintes informações específicas para marketplace:

**INFORMAÇÕES OBRIGATÓRIAS:**
- Tipo de Roupa: (ex: Camiseta, Calça, Vestido, Moletom, Jaqueta, etc.)
- Produto de Vestuário: (ex: Camiseta Básica, Calça Jeans, etc.)
- Tipo de Manga: (Curta, Longa, Sem Manga, Manga 3/4, etc.)
- Gênero: (Masculino, Feminino, Unissex, Sem gênero, etc.)
- Cor: (Branco, Preto, Azul, Multicolorido, etc.)
- SKU (SELLER_SKU): (Extrair do produto se visível)
- Forma de Caimento (WEDGE_SHAPE): (Reta, Ajustada, Solta, etc.)
- É Esportiva (IS_SPORTIVE): (Sim, Não)
- Cor Principal (MAIN_COLOR): (Cor predominante)
- Condição do Item (ITEM_CONDITION): (Novo, Usado, etc.)
- Marca (BRAND): (Nome da marca)

**VARIAÇÕES DO NOME:**
Liste 5 termos de busca alternativos para este produto (ex: Produto Básico, Produto Casual, Produto Simples, Produto Essencial, Produto Versátil)

**FORMATO DE RESPOSTA:**
Responda APENAS com as informações extraídas, uma por linha, no formato:
Tipo de Roupa: [valor]
Produto de Vestuário: [valor]
Tipo de Manga: [valor]
Gênero: [valor]
Cor: [valor]
SKU (SELLER_SKU): [valor]
Forma de Caimento (WEDGE_SHAPE): [valor]
É Esportiva (IS_SPORTIVE): [valor]
Cor Principal (MAIN_COLOR): [valor]
Condição do Item (ITEM_CONDITION): [valor]
Marca (BRAND): [valor]

Variações do Nome:
- [termo1]
- [termo2]
- [termo3]
- [termo4]
- [termo5]

Se alguma informação não estiver visível nas imagens, use "N/A" como valor.`;
    
    // Atualizar o agente com o novo prompt para marketplace
    await connection.execute(`
      UPDATE agents 
      SET 
        max_tokens = 1000,
        temperature = 0.3,
        guidelines_template = ?,
        updated_at = NOW()
      WHERE function_type = 'image_analysis' AND is_active = TRUE
    `, [newGuidelinesTemplate]);
    
    console.log('✅ Agente atualizado com prompt para marketplace!');
    
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
      console.log('\n📝 Novo Guidelines Template:');
      console.log(agents[0].guidelines_template);
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

updateAgentMarketplace();
