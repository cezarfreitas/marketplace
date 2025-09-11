const mysql = require('mysql2/promise');

async function updateAgentMarketplaceOptions() {
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

    console.log('🔧 Atualizando agente com opções predefinidas...');
    
    const newGuidelinesTemplate = `Analise esta peça de vestuário e extraia as informações específicas para marketplace. Use APENAS as opções predefinidas abaixo:

**TIPO DE MANGA - Escolha APENAS UMA:**
- Curta
- Longa  
- Sem Manga
- Manga 3/4
- Tomara que caia

**COR PRINCIPAL - Escolha APENAS UMA:**
- Branco
- Preto
- Azul
- Vermelho
- Verde
- Amarelo
- Rosa
- Roxo
- Cinza
- Marrom
- Bege
- Multicolorido

**FORMA DE CAIMENTO (WEDGE_SHAPE) - Escolha APENAS UMA:**
- Reta
- Ajustada
- Solta
- Oversize
- Slim

**É ESPORTIVA (IS_SPORTIVE) - Escolha APENAS UMA:**
- Sim
- Não

**CONDIÇÃO DO ITEM (ITEM_CONDITION) - Escolha APENAS UMA:**
- Novo
- Usado
- Recondicionado

**VARIAÇÕES DO NOME:**
Liste 5 termos de busca alternativos para este produto (ex: Produto Básico, Produto Casual, Produto Simples, Produto Essencial, Produto Versátil)

**FORMATO DE RESPOSTA OBRIGATÓRIO:**
Responda EXATAMENTE no formato abaixo, usando APENAS as opções predefinidas:

Tipo de Manga: [escolha uma das opções acima]
Cor Principal: [escolha uma das opções acima]
Forma de Caimento (WEDGE_SHAPE): [escolha uma das opções acima]
É Esportiva (IS_SPORTIVE): [escolha uma das opções acima]
Condição do Item (ITEM_CONDITION): [escolha uma das opções acima]

Variações do Nome:
- [termo1]
- [termo2]
- [termo3]
- [termo4]
- [termo5]

**IMPORTANTE:**
- Use APENAS as opções predefinidas listadas acima
- NÃO crie novas opções
- Se não conseguir identificar claramente, escolha a opção mais provável
- Seja consistente com o que você vê nas imagens`;
    
    // Atualizar o agente com o prompt com opções predefinidas
    await connection.execute(`
      UPDATE agents 
      SET 
        max_tokens = 600,
        temperature = 0.2,
        guidelines_template = ?,
        updated_at = NOW()
      WHERE function_type = 'image_analysis' AND is_active = TRUE
    `, [newGuidelinesTemplate]);
    
    console.log('✅ Agente atualizado com opções predefinidas!');
    
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

updateAgentMarketplaceOptions();
