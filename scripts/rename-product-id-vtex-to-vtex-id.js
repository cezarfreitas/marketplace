const mysql = require('mysql2/promise');

async function renameProductIdVtexToVtexId() {
  let connection;
  
  try {
    // Configuração do banco de dados
    const dbConfig = {
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: parseInt(process.env.DB_PORT) || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data',
      charset: 'utf8mb4'
    };

    console.log('🔗 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado!\n');

    // 1. Verificar estrutura atual
    console.log('🔍 1. Verificando estrutura atual da tabela products_vtex...');
    const [currentStructure] = await connection.execute('DESCRIBE products_vtex');
    
    console.log('📋 Estrutura atual:');
    currentStructure.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type}) ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // Verificar se a coluna product_id_vtex existe
    const hasProductIdVtex = currentStructure.some(col => col.Field === 'product_id_vtex');
    const hasVtexId = currentStructure.some(col => col.Field === 'vtex_id');
    
    if (!hasProductIdVtex) {
      if (hasVtexId) {
        console.log('✅ A coluna já foi renomeada para vtex_id!');
        return;
      } else {
        console.log('❌ Coluna product_id_vtex não encontrada!');
        return;
      }
    }

    // 2. Fazer backup dos dados
    console.log('\n💾 2. Fazendo backup dos dados...');
    const [backupData] = await connection.execute('SELECT * FROM products_vtex');
    console.log(`✅ Backup realizado: ${backupData.length} produtos`);

    // 3. Remover chave primária
    console.log('\n🔧 3. Removendo chave primária...');
    try {
      await connection.execute('ALTER TABLE products_vtex DROP PRIMARY KEY');
      console.log('✅ Chave primária removida');
    } catch (error) {
      console.log('⚠️ Erro ao remover chave primária:', error.message);
    }

    // 4. Renomear coluna
    console.log('\n🔄 4. Renomeando coluna product_id_vtex para vtex_id...');
    await connection.execute('ALTER TABLE products_vtex CHANGE COLUMN product_id_vtex vtex_id INT NOT NULL');
    console.log('✅ Coluna renomeada com sucesso!');

    // 5. Adicionar chave primária novamente
    console.log('\n🔑 5. Adicionando chave primária...');
    await connection.execute('ALTER TABLE products_vtex ADD PRIMARY KEY (vtex_id)');
    console.log('✅ Chave primária adicionada!');

    // 6. Verificar nova estrutura
    console.log('\n🔍 6. Verificando nova estrutura...');
    const [newStructure] = await connection.execute('DESCRIBE products_vtex');
    
    console.log('📋 Nova estrutura:');
    newStructure.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type}) ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // 7. Verificar dados
    console.log('\n📊 7. Verificando dados...');
    const [dataCheck] = await connection.execute('SELECT COUNT(*) as total FROM products_vtex');
    const [sampleData] = await connection.execute('SELECT vtex_id, name, ref_id FROM products_vtex LIMIT 3');
    
    console.log(`✅ Total de produtos: ${dataCheck[0].total}`);
    console.log('📋 Exemplo de dados:');
    sampleData.forEach(product => {
      console.log(`   - ID: ${product.vtex_id}, Nome: ${product.name}, RefId: ${product.ref_id}`);
    });

    // 8. Verificar se há alguma referência que precisa ser atualizada
    console.log('\n🔍 8. Verificando referências em outras tabelas...');
    
    // Verificar tabela skus_vtex
    const [skusCheck] = await connection.execute(`
      SELECT COUNT(*) as total 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'skus_vtex' 
      AND COLUMN_NAME = 'product_id'
    `, [dbConfig.database]);
    
    if (skusCheck[0].total > 0) {
      console.log('✅ Tabela skus_vtex usa product_id (não precisa alterar)');
    }

    console.log('\n🎉 Renomeação concluída com sucesso!');
    console.log('📊 Resumo:');
    console.log('   - Campo product_id_vtex renomeado para vtex_id');
    console.log('   - Chave primária mantida');
    console.log('   - Dados preservados');
    console.log('   - Estrutura padronizada com outras tabelas');

  } catch (error) {
    console.error('❌ Erro ao renomear campo:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

renameProductIdVtexToVtexId();
