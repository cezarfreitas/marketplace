const mysql = require('mysql2/promise');

async function renameProductVtexId() {
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
      // Renomear a coluna vtex_id para product_id_vtex na tabela products_vtex (sem PRIMARY KEY)
      'ALTER TABLE products_vtex CHANGE COLUMN vtex_id product_id_vtex INT NOT NULL COMMENT \'ID do produto na VTEX (campo Id do payload)\'',
      
      // Atualizar a coluna product_vtex_id na tabela skus_vtex para referenciar o novo nome
      'ALTER TABLE skus_vtex CHANGE COLUMN product_vtex_id product_id_vtex INT NOT NULL COMMENT \'ID do produto na VTEX (referência para products_vtex.product_id_vtex)\''
    ];

    console.log(`📝 Executando ${sqlCommands.length} comandos SQL...`);

    // Executar cada comando
    for (let i = 0; i < sqlCommands.length; i++) {
      console.log(`⚡ Executando comando ${i + 1}/${sqlCommands.length}...`);
      await connection.execute(sqlCommands[i]);
    }

    console.log('✅ Campos renomeados com sucesso!');

    // Verificar a nova estrutura da tabela products_vtex
    console.log('🔍 Verificando nova estrutura da tabela products_vtex...');
    const [productsRows] = await connection.execute('DESCRIBE products_vtex');
    console.log('📋 Estrutura atualizada da tabela products_vtex:');
    console.table(productsRows);

    // Verificar a nova estrutura da tabela skus_vtex
    console.log('🔍 Verificando nova estrutura da tabela skus_vtex...');
    const [skusRows] = await connection.execute('DESCRIBE skus_vtex');
    console.log('📋 Estrutura atualizada da tabela skus_vtex:');
    console.table(skusRows);

    // Verificar se os dados ainda estão lá
    console.log('🔍 Verificando dados após renomeação...');
    const [productsData] = await connection.execute('SELECT product_id_vtex, name, ref_id FROM products_vtex');
    console.log(`✅ ${productsData.length} produtos encontrados após renomeação:`);
    productsData.forEach((product, index) => {
      console.log(`   ${index + 1}. ID Produto VTEX: ${product.product_id_vtex} - Nome: ${product.name} - Ref: ${product.ref_id}`);
    });

    const [skusData] = await connection.execute('SELECT id_sku_vtex, product_id_vtex, name, ref_id FROM skus_vtex');
    console.log(`✅ ${skusData.length} SKUs encontrados após renomeação:`);
    skusData.forEach((sku, index) => {
      console.log(`   ${index + 1}. ID SKU VTEX: ${sku.id_sku_vtex} - Produto: ${sku.product_id_vtex} - Nome: ${sku.name} - Ref: ${sku.ref_id}`);
    });

    // Testar consulta com os novos nomes
    console.log('🔍 Testando consulta com novos nomes de campos...');
    const [testQuery] = await connection.execute(`
      SELECT 
        p.product_id_vtex,
        p.name as product_name,
        s.id_sku_vtex,
        s.name as sku_name,
        s.ref_id as sku_ref_id
      FROM products_vtex p
      INNER JOIN skus_vtex s ON p.product_id_vtex = s.product_id_vtex
      WHERE p.product_id_vtex = 203712111
      ORDER BY s.name
    `);

    console.log('✅ Consulta com novos nomes funcionando:');
    testQuery.forEach((row, index) => {
      console.log(`   ${index + 1}. Produto ${row.product_id_vtex}: "${row.product_name}" -> SKU ${row.id_sku_vtex}: "${row.sku_name}"`);
    });

    // Verificar relacionamento
    console.log('🔍 Verificando relacionamento após renomeação...');
    const [relationship] = await connection.execute(`
      SELECT 
        p.product_id_vtex,
        p.name as product_name,
        COUNT(s.id_sku_vtex) as sku_count
      FROM products_vtex p
      LEFT JOIN skus_vtex s ON p.product_id_vtex = s.product_id_vtex
      GROUP BY p.product_id_vtex, p.name
      ORDER BY p.product_id_vtex
    `);

    console.log('✅ Relacionamento funcionando com novos nomes:');
    relationship.forEach(rel => {
      console.log(`   - Produto ${rel.product_id_vtex}: "${rel.product_name}" (${rel.sku_count} SKUs)`);
    });

  } catch (error) {
    console.error('❌ Erro ao renomear campos:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('🔌 Conexão com banco de dados encerrada');
  }
}

// Executar a função
renameProductVtexId()
  .then(() => {
    console.log('🎉 Renomeação concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
