const mysql = require('mysql2/promise');

async function renameSkuVtexId() {
  const connection = await mysql.createConnection({
    host: 'server.idenegociosdigitais.com.br',
    port: 3342,
    user: 'seo_data',
    password: '54779042baaa70be95c0',
    database: 'seo_data'
  });

  try {
    console.log('🔗 Conectado ao banco de dados remoto...');

    // Comandos SQL para renomear o campo
    const sqlCommands = [
      // Renomear a coluna vtex_id para id_sku_vtex (sem PRIMARY KEY na mudança)
      'ALTER TABLE skus_vtex CHANGE COLUMN vtex_id id_sku_vtex INT NOT NULL COMMENT \'ID do SKU na VTEX (campo Id do payload)\''
    ];

    console.log(`📝 Executando ${sqlCommands.length} comandos SQL...`);

    // Executar cada comando
    for (let i = 0; i < sqlCommands.length; i++) {
      console.log(`⚡ Executando comando ${i + 1}/${sqlCommands.length}...`);
      await connection.execute(sqlCommands[i]);
    }

    console.log('✅ Campo renomeado com sucesso!');

    // Verificar a nova estrutura da tabela
    console.log('🔍 Verificando nova estrutura da tabela...');
    const [rows] = await connection.execute('DESCRIBE skus_vtex');
    console.log('📋 Estrutura atualizada da tabela skus_vtex:');
    console.table(rows);

    // Verificar se os dados ainda estão lá
    console.log('🔍 Verificando dados após renomeação...');
    const [data] = await connection.execute('SELECT id_sku_vtex, product_vtex_id, name, ref_id FROM skus_vtex WHERE product_vtex_id = 203712111');
    console.log(`✅ ${data.length} SKUs encontrados após renomeação:`);
    data.forEach((sku, index) => {
      console.log(`   ${index + 1}. ID SKU VTEX: ${sku.id_sku_vtex} - Nome: ${sku.name} - Ref: ${sku.ref_id}`);
    });

    // Testar consulta com o novo nome
    console.log('🔍 Testando consulta com novo nome de campo...');
    const [testQuery] = await connection.execute(`
      SELECT 
        p.vtex_id as product_vtex_id,
        p.name as product_name,
        s.id_sku_vtex as sku_vtex_id,
        s.name as sku_name,
        s.ref_id as sku_ref_id
      FROM products_vtex p
      INNER JOIN skus_vtex s ON p.vtex_id = s.product_vtex_id
      WHERE p.vtex_id = 203712111
      ORDER BY s.name
    `);

    console.log('✅ Consulta com novo nome funcionando:');
    testQuery.forEach((row, index) => {
      console.log(`   ${index + 1}. Produto ${row.product_vtex_id}: "${row.product_name}" -> SKU ${row.sku_vtex_id}: "${row.sku_name}"`);
    });

  } catch (error) {
    console.error('❌ Erro ao renomear campo:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('🔌 Conexão com banco de dados encerrada');
  }
}

// Executar a função
renameSkuVtexId()
  .then(() => {
    console.log('🎉 Renomeação concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
