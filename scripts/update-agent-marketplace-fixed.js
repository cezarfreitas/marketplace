const mysql = require('mysql2/promise');

async function updateAgentMarketplaceFixed() {
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

    console.log('🔧 Atualizando agente com prompt corrigido para marketplace...');
    
    const newGuidelinesTemplate = `Analise esta peça de vestuário e extraia APENAS as informações que não estão disponíveis nos dados do produto:

**INFORMAÇÕES QUE VOCÊ DEVE ANALISAR NAS IMAGENS:**
- Tipo de Manga: (Curta, Longa, Sem Manga, Manga 3/4, Tomara que caia, etc.)
- Cor Principal: (Branco, Preto, Azul, Vermelho, Verde, Amarelo, Rosa, Roxo, Cinza, Marrom, Bege, Multicolorido, etc.)
- Forma de Caimento (WEDGE_SHAPE): (Reta, Ajustada, Solta, Oversize, Slim, etc.)
- É Esportiva (IS_SPORTIVE): (Sim, Não)
- Condição do Item (ITEM_CONDITION): (Novo, Usado, Recondicionado)

**VARIAÇÕES DO NOME:**
Liste 5 termos de busca alternativos para este produto (ex: Produto Básico, Produto Casual, Produto Simples, Produto Essencial, Produto Versátil)

**INFORMAÇÕES QUE JÁ TEMOS (NÃO PRECISA ANALISAR):**
- Tipo de Roupa: Já está no nome do produto
- Gênero: Já está no nome do produto  
- Marca: Já está no nome do produto
- SKU: Já está nos dados do produto
- Cor: Será baseada na cor principal detectada

**FORMATO DE RESPOSTA:**
Responda APENAS com as informações que você analisou nas imagens, uma por linha, no formato:
Tipo de Manga: [valor]
Cor Principal: [valor]
Forma de Caimento (WEDGE_SHAPE): [valor]
É Esportiva (IS_SPORTIVE): [valor]
Condição do Item (ITEM_CONDITION): [valor]

Variações do Nome:
- [termo1]
- [termo2]
- [termo3]
- [termo4]
- [termo5]

Se alguma informação não estiver visível nas imagens, use "N/A" como valor.`;
    
    // Atualizar o agente com o prompt corrigido
    await connection.execute(`
      UPDATE agents 
      SET 
        max_tokens = 800,
        temperature = 0.3,
        guidelines_template = ?,
        updated_at = NOW()
      WHERE function_type = 'image_analysis' AND is_active = TRUE
    `, [newGuidelinesTemplate]);
    
    console.log('✅ Agente atualizado com prompt corrigido!');
    
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

updateAgentMarketplaceFixed();
