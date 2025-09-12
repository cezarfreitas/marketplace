const mysql = require('mysql2/promise');

async function debugGenerateDescription() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // 1. Verificar se a tabela titles existe
    console.log('🔍 Verificando tabela titles...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'titles'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela titles não existe!');
      return;
    }
    
    console.log('✅ Tabela titles existe!');

    // 2. Verificar estrutura da tabela titles
    console.log('\n📊 Estrutura da tabela titles:');
    const [structure] = await connection.execute('DESCRIBE titles');
    structure.forEach(field => {
      console.log(`   - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${field.Key ? `[${field.Key}]` : ''}`);
    });

    // 3. Verificar se há títulos para o produto de teste
    console.log('\n🔍 Verificando títulos para produto 203723142...');
    const [titles] = await connection.execute(`
      SELECT * FROM titles 
      WHERE product_id = 203723142 AND status = 'validated'
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (titles.length === 0) {
      console.log('❌ Nenhum título validado encontrado para o produto 203723142!');
      
      // Verificar se há títulos com outros status
      const [allTitles] = await connection.execute(`
        SELECT * FROM titles 
        WHERE product_id = 203723142
        ORDER BY created_at DESC 
        LIMIT 3
      `);
      
      if (allTitles.length > 0) {
        console.log('📝 Títulos encontrados com outros status:');
        allTitles.forEach((title, index) => {
          console.log(`   ${index + 1}. Status: ${title.status}, Título: ${title.title}`);
        });
      } else {
        console.log('❌ Nenhum título encontrado para este produto!');
      }
    } else {
      console.log('✅ Título encontrado:', titles[0].title);
    }

    // 4. Verificar agente
    console.log('\n🤖 Verificando agente...');
    const [agents] = await connection.execute(`
      SELECT * FROM agents 
      WHERE function_type = 'product_description' 
      AND is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (agents.length === 0) {
      console.log('❌ Nenhum agente ativo encontrado!');
    } else {
      const agent = agents[0];
      console.log(`✅ Agente encontrado: ${agent.name} (ID: ${agent.id})`);
      console.log(`   - Modelo: ${agent.model}`);
      console.log(`   - Max Tokens: ${agent.max_tokens}`);
      console.log(`   - Temperature: ${agent.temperature}`);
    }

    // 5. Verificar variáveis de ambiente
    console.log('\n🔑 Verificando variáveis de ambiente...');
    const openaiKey = process.env.OPENAI_API_KEY;
    console.log(`   OPENAI_API_KEY: ${openaiKey ? 'Configurada' : 'NÃO CONFIGURADA'}`);
    
    if (openaiKey) {
      console.log(`   Tamanho da chave: ${openaiKey.length} caracteres`);
      console.log(`   Início: ${openaiKey.substring(0, 10)}...`);
    }

    // 6. Testar query que a API usa
    console.log('\n🧪 Testando query da API...');
    try {
      const [testQuery] = await connection.execute(`
        SELECT title FROM titles 
        WHERE product_id = 203723142 AND status = 'validated'
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      if (testQuery.length > 0) {
        console.log('✅ Query de título funcionou:', testQuery[0].title);
      } else {
        console.log('❌ Query de título não retornou resultados');
      }
    } catch (error) {
      console.log('❌ Erro na query de título:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugGenerateDescription();
