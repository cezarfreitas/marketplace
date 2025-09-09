const mysql = require('mysql2/promise');

async function demoStockImport() {
  let connection;
  
  try {
    // Configuração do banco de dados
    const dbConfig = {
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli',
      charset: 'utf8mb4'
    };

    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Verificar se existem produtos e SKUs
    console.log('\n📊 1. Verificando dados no banco...');
    const [productCount] = await connection.execute('SELECT COUNT(*) as total FROM products');
    const [skuCount] = await connection.execute('SELECT COUNT(*) as total FROM skus');
    
    console.log(`📋 Produtos: ${productCount[0].total}`);
    console.log(`📋 SKUs: ${skuCount[0].total}`);
    
    if (productCount[0].total === 0 || skuCount[0].total === 0) {
      console.log('\n⚠️ Banco de dados está vazio!');
      console.log('💡 Para testar a importação de estoque:');
      console.log('   1. Importe produtos primeiro usando a API de importação');
      console.log('   2. Depois execute o script de importação de estoque');
      console.log('\n📝 Exemplo de dados de estoque que seriam importados:');
      
      // 2. Mostrar exemplo de dados que seriam importados
      const exampleStockData = {
        skuId: "203717120",
        balance: [
          {
            warehouseId: "1",
            warehouseName: "eStyle",
            totalQuantity: 0,
            reservedQuantity: 0,
            hasUnlimitedQuantity: false,
            timeToRefill: null,
            dateOfSupplyUtc: null,
            leadTime: "00:00:00"
          },
          {
            warehouseId: "13",
            warehouseName: "13",
            totalQuantity: 0,
            reservedQuantity: 0,
            hasUnlimitedQuantity: false,
            timeToRefill: null,
            dateOfSupplyUtc: null,
            leadTime: "00:00:00"
          },
          {
            warehouseId: "1a77e3c",
            warehouseName: "Meli",
            totalQuantity: 0,
            reservedQuantity: 0,
            hasUnlimitedQuantity: false,
            timeToRefill: null,
            dateOfSupplyUtc: null,
            leadTime: "00:00:00"
          }
        ]
      };
      
      console.log('\n📋 Estrutura dos dados de estoque:');
      console.log(JSON.stringify(exampleStockData, null, 2));
      
      return;
    }
    
    // 3. Se houver dados, mostrar como seria a importação
    console.log('\n🔄 3. Simulando importação de estoque...');
    
    // Buscar alguns SKUs para demonstrar
    const [skus] = await connection.execute(`
      SELECT s.id, s.vtex_id, s.name_complete, p.name as product_name, p.ref_id
      FROM skus s
      JOIN products p ON s.product_id = p.id
      ORDER BY s.id
      LIMIT 3
    `);
    
    console.log(`📊 Encontrados ${skus.length} SKUs para demonstrar importação:`);
    
    for (const sku of skus) {
      console.log(`\n🔍 SKU: ${sku.vtex_id} (${sku.name_complete})`);
      console.log(`   Produto: ${sku.product_name} (${sku.ref_id})`);
      console.log(`   ID Interno: ${sku.id}`);
      console.log(`   📤 Seria feita requisição para: https://projetoinfluencer.vtexcommercestable.com.br/api/logistics/pvt/inventory/skus/${sku.vtex_id}`);
      console.log(`   📥 Dados seriam inseridos na tabela 'stock'`);
    }
    
    // 4. Verificar estrutura das tabelas
    console.log('\n📋 4. Verificando estrutura das tabelas de estoque...');
    
    const [stockStructure] = await connection.execute('DESCRIBE stock');
    console.log('📊 Estrutura da tabela stock:');
    console.table(stockStructure);
    
    const [warehouseStructure] = await connection.execute('DESCRIBE warehouses');
    console.log('📊 Estrutura da tabela warehouses:');
    console.table(warehouseStructure);
    
    // 5. Mostrar warehouses cadastrados
    console.log('\n🏢 5. Warehouses cadastrados:');
    const [warehouses] = await connection.execute('SELECT * FROM warehouses ORDER BY warehouse_name');
    console.table(warehouses);
    
    console.log('\n✅ Demonstração concluída!');
    console.log('💡 Para importar dados reais de estoque:');
    console.log('   1. Certifique-se de que há produtos e SKUs no banco');
    console.log('   2. Execute: node scripts/import-stock-data.js');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar o script
demoStockImport();
