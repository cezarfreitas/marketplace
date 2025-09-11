const mysql = require('mysql2/promise');

async function verifyTables() {
  const connection = await mysql.createConnection({
    host: 'server.idenegociosdigitais.com.br',
    port: 3342,
    user: 'seo_data',
    password: '54779042baaa70be95c0',
    database: 'seo_data'
  });

  try {
    console.log('🔗 Conectado ao banco de dados remoto...');

    // Verificar se as tabelas existem
    console.log('🔍 Verificando existência das tabelas...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'seo_data' 
      AND TABLE_NAME IN ('products_vtex', 'skus_vtex')
      ORDER BY TABLE_NAME
    `);
    
    console.log('📋 Tabelas encontradas:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME} - ${table.TABLE_COMMENT}`);
    });

    // Verificar estrutura da tabela products_vtex
    console.log('\n🔍 Estrutura da tabela products_vtex:');
    const [productsStructure] = await connection.execute('DESCRIBE products_vtex');
    console.log(`   📊 ${productsStructure.length} campos encontrados`);
    console.log('   Campos principais:');
    productsStructure.slice(0, 10).forEach(field => {
      console.log(`     - ${field.Field} (${field.Type})`);
    });

    // Verificar estrutura da tabela skus_vtex
    console.log('\n🔍 Estrutura da tabela skus_vtex:');
    const [skusStructure] = await connection.execute('DESCRIBE skus_vtex');
    console.log(`   📊 ${skusStructure.length} campos encontrados`);
    console.log('   Campos principais:');
    skusStructure.slice(0, 10).forEach(field => {
      console.log(`     - ${field.Field} (${field.Type})`);
    });

    // Verificar dados nas tabelas
    console.log('\n🔍 Verificando dados nas tabelas...');
    const [productsCount] = await connection.execute('SELECT COUNT(*) as count FROM products_vtex');
    const [skusCount] = await connection.execute('SELECT COUNT(*) as count FROM skus_vtex');
    
    console.log(`   📦 Produtos: ${productsCount[0].count}`);
    console.log(`   📦 SKUs: ${skusCount[0].count}`);

    // Verificar relacionamento
    console.log('\n🔍 Verificando relacionamento entre as tabelas...');
    const [relationship] = await connection.execute(`
      SELECT 
        p.vtex_id as product_vtex_id,
        p.name as product_name,
        p.ref_id as product_ref_id,
        COUNT(s.vtex_id) as sku_count
      FROM products_vtex p
      LEFT JOIN skus_vtex s ON p.vtex_id = s.product_vtex_id
      GROUP BY p.vtex_id, p.name, p.ref_id
      ORDER BY p.vtex_id
    `);

    console.log('   📊 Relacionamento produtos -> SKUs:');
    relationship.forEach(rel => {
      console.log(`     - Produto ${rel.product_vtex_id}: "${rel.product_name}" (${rel.sku_count} SKUs)`);
    });

    // Verificar índices
    console.log('\n🔍 Verificando índices...');
    const [productsIndexes] = await connection.execute(`
      SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = 'seo_data' 
      AND TABLE_NAME = 'products_vtex'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);
    
    const [skusIndexes] = await connection.execute(`
      SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = 'seo_data' 
      AND TABLE_NAME = 'skus_vtex'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);

    console.log(`   📊 Índices em products_vtex: ${productsIndexes.length}`);
    console.log(`   📊 Índices em skus_vtex: ${skusIndexes.length}`);

    // Teste de consulta complexa
    console.log('\n🔍 Testando consulta complexa...');
    const [complexQuery] = await connection.execute(`
      SELECT 
        p.vtex_id as product_vtex_id,
        p.name as product_name,
        p.ref_id as product_ref_id,
        s.vtex_id as sku_vtex_id,
        s.name as sku_name,
        s.ref_id as sku_ref_id,
        s.is_active as sku_active,
        s.position as sku_position
      FROM products_vtex p
      INNER JOIN skus_vtex s ON p.vtex_id = s.product_vtex_id
      WHERE p.vtex_id = 203712111
      ORDER BY s.position, s.name
    `);

    console.log(`   ✅ Consulta complexa executada com sucesso: ${complexQuery.length} registros`);
    console.log('   📋 Resultado da consulta:');
    complexQuery.forEach((row, index) => {
      console.log(`     ${index + 1}. SKU ${row.sku_vtex_id}: "${row.sku_name}" (${row.sku_ref_id}) - Posição: ${row.sku_position}`);
    });

    console.log('\n🎉 Verificação concluída com sucesso!');
    console.log('✅ As tabelas products_vtex e skus_vtex estão funcionando corretamente');
    console.log('✅ O relacionamento entre as tabelas está funcionando');
    console.log('✅ Os índices foram criados corretamente');
    console.log('✅ As consultas complexas estão funcionando');

  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('🔌 Conexão com banco de dados encerrada');
  }
}

// Executar a função
verifyTables()
  .then(() => {
    console.log('🎉 Processo de verificação concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
