const mysql = require('mysql2/promise');

async function debugDescriptionsTable() {
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

    // 1. Verificar se a tabela descriptions existe
    console.log('🔍 Verificando tabela descriptions...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'descriptions'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela descriptions não existe!');
      return;
    }
    
    console.log('✅ Tabela descriptions existe!');

    // 2. Verificar estrutura da tabela
    console.log('\n📊 Estrutura da tabela descriptions:');
    const [structure] = await connection.execute('DESCRIBE descriptions');
    structure.forEach(field => {
      console.log(`   - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${field.Key ? `[${field.Key}]` : ''}`);
    });

    // 3. Verificar se há registros
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM descriptions');
    console.log(`\n📈 Total de registros: ${count[0].total}`);

    // 4. Testar inserção simples
    console.log('\n🧪 Testando inserção simples...');
    try {
      const testInsert = `
        INSERT INTO descriptions (
          product_id, title, description, status
        ) VALUES (?, ?, ?, ?)
      `;
      
      await connection.execute(testInsert, [
        999999, // ID de teste
        'Teste',
        'Descrição de teste',
        'test'
      ]);
      
      console.log('✅ Inserção de teste funcionou!');
      
      // Remover o registro de teste
      await connection.execute('DELETE FROM descriptions WHERE product_id = 999999');
      console.log('🗑️ Registro de teste removido');
      
    } catch (insertError) {
      console.log('❌ Erro na inserção de teste:', insertError.message);
    }

    // 5. Verificar se há produtos com títulos
    console.log('\n🔍 Verificando produtos com títulos...');
    const [productsWithTitles] = await connection.execute(`
      SELECT p.id, p.name, t.title
      FROM products_vtex p
      INNER JOIN titles t ON p.id = t.product_id
      WHERE t.status = 'validated'
      LIMIT 3
    `);

    if (productsWithTitles.length === 0) {
      console.log('❌ Nenhum produto com título encontrado!');
    } else {
      console.log(`✅ Encontrados ${productsWithTitles.length} produtos com títulos:`);
      productsWithTitles.forEach((product, index) => {
        console.log(`   ${index + 1}. ID: ${product.id} - ${product.name}`);
        console.log(`      Título: ${product.title}`);
      });
    }

    // 6. Verificar agente
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
      console.log(`   - System Prompt: ${agent.system_prompt ? 'Configurado' : 'NÃO CONFIGURADO'}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugDescriptionsTable();
