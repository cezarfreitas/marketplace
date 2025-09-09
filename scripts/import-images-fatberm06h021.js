const mysql = require('mysql2/promise');

async function importImagesForFATBERM06H021() {
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
    
    const refId = 'FATBERM06H021';
    console.log(`🖼️ Importando imagens para o produto: ${refId}`);
    
    // 1. Buscar produto
    console.log('\n📦 1. Buscando produto...');
    const [products] = await connection.execute(
      'SELECT * FROM products WHERE ref_id = ?',
      [refId]
    );
    
    if (products.length === 0) {
      console.log('❌ Produto não encontrado');
      return;
    }
    
    const product = products[0];
    console.log(`✅ Produto encontrado: ${product.name} (VTEX ID: ${product.vtex_id})`);
    
    // 2. Buscar SKUs do produto
    console.log('\n📋 2. Buscando SKUs...');
    const [skus] = await connection.execute(
      'SELECT * FROM skus WHERE product_id = ? ORDER BY id',
      [product.id]
    );
    
    console.log(`📊 Encontrados ${skus.length} SKUs`);
    
    if (skus.length === 0) {
      console.log('❌ Nenhum SKU encontrado');
      return;
    }
    
    // 3. Simular chamadas da API VTEX para buscar imagens
    console.log('\n🖼️ 3. Simulando chamadas da API VTEX...');
    
    // URLs da API VTEX para buscar imagens de cada SKU
    const vtexApiUrls = skus.map(sku => ({
      skuId: sku.vtex_id,
      skuName: sku.name_complete,
      url: `https://api.vtex.com/api/catalog/pvt/stockkeepingunit/${sku.vtex_id}/file`
    }));
    
    console.log('📋 URLs da API VTEX para buscar imagens:');
    vtexApiUrls.forEach((item, index) => {
      console.log(`  ${index + 1}. SKU ${item.skuId} (${item.skuName}): ${item.url}`);
    });
    
    // 4. Verificar se já existem imagens na tabela images
    console.log('\n🔍 4. Verificando imagens existentes...');
    const [existingImages] = await connection.execute(`
      SELECT 
        i.id,
        i.sku_id,
        i.vtex_id,
        i.url,
        s.name_complete as sku_name
      FROM images i
      JOIN skus s ON i.sku_id = s.id
      WHERE s.product_id = ?
      ORDER BY i.created_at DESC
    `, [product.id]);
    
    console.log(`📊 Imagens existentes: ${existingImages.length}`);
    if (existingImages.length > 0) {
      console.log('📋 Imagens já existentes:');
      existingImages.forEach((img, index) => {
        console.log(`  ${index + 1}. Image ID: ${img.id}, SKU: ${img.sku_name}, URL: ${img.url}`);
      });
    }
    
    // 5. Análise do problema
    console.log('\n🔍 5. Análise do problema:');
    console.log('📋 Possíveis causas para 0 imagens:');
    console.log('1. ❓ API VTEX não retorna imagens para estes SKUs');
    console.log('2. ❓ Processo de importação de imagens não foi executado');
    console.log('3. ❓ Erro na validação ou inserção das imagens');
    console.log('4. ❓ SKUs não têm imagens cadastradas no VTEX');
    
    console.log('\n💡 Próximos passos recomendados:');
    console.log('1. 🔧 Executar processo de importação de imagens');
    console.log('2. 🔧 Verificar se os SKUs têm imagens no VTEX');
    console.log('3. 🔧 Testar API VTEX diretamente');
    console.log('4. 🔧 Verificar logs de erro na importação');
    
    // 6. Sugestão de comando para importar
    console.log('\n🚀 6. Para importar imagens, execute:');
    console.log('   - Use a API de importação: POST /api/import/products');
    console.log('   - Ou execute o processo de importação em lote');
    console.log('   - Ou use o método importCompleteProductByRefId do VTEXService');
    
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
importImagesForFATBERM06H021();
