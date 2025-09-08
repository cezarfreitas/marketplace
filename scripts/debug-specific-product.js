const mysql = require('mysql2/promise');

async function debugSpecificProduct() {
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
    
    const refId = 'ECKCAMM12H0J1';
    console.log(`🔍 Debugando produto específico: ${refId}`);
    
    // 1. Verificar produto no banco
    console.log('\n📦 1. Verificando produto no banco...');
    const [products] = await connection.execute(
      'SELECT * FROM products WHERE ref_id = ?',
      [refId]
    );
    
    if (products.length === 0) {
      console.log('❌ Produto não encontrado no banco');
      return;
    }
    
    const product = products[0];
    console.log('📋 Produto encontrado:');
    console.log(`  - ID: ${product.id}`);
    console.log(`  - VTEX ID: ${product.vtex_id}`);
    console.log(`  - Nome: ${product.name}`);
    console.log(`  - Ref ID: ${product.ref_id}`);
    console.log(`  - Brand ID: ${product.brand_id}`);
    console.log(`  - Category ID: ${product.category_id}`);
    
    // 2. Verificar SKUs do produto
    console.log('\n📋 2. Verificando SKUs do produto...');
    const [skus] = await connection.execute(
      'SELECT * FROM skus WHERE product_id = ? ORDER BY id',
      [product.id]
    );
    
    console.log(`📊 Encontrados ${skus.length} SKUs:`);
    skus.forEach((sku, index) => {
      console.log(`  ${index + 1}. SKU ID: ${sku.id}, VTEX ID: ${sku.vtex_id}, Nome: ${sku.name_complete}`);
    });
    
    // 3. Verificar imagens do produto
    console.log('\n🖼️ 3. Verificando imagens do produto...');
    const [images] = await connection.execute(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY id',
      [product.id]
    );
    
    console.log(`📊 Encontradas ${images.length} imagens:`);
    if (images.length > 0) {
      images.forEach((image, index) => {
        console.log(`  ${index + 1}. URL: ${image.image_url}`);
        console.log(`     Nome: ${image.image_name}`);
        console.log(`     File ID: ${image.file_id}`);
      });
    } else {
      console.log('❌ Nenhuma imagem encontrada');
    }
    
    // 4. Simular chamadas da API VTEX
    console.log('\n🔍 4. Simulando chamadas da API VTEX...');
    
    // URL para buscar imagens de cada SKU
    skus.forEach((sku, index) => {
      const vtexImageUrl = `https://api.vtex.com/api/catalog/pvt/stockkeepingunit/${sku.vtex_id}/file`;
      console.log(`  SKU ${index + 1} (${sku.vtex_id}): ${vtexImageUrl}`);
    });
    
    // 5. Verificar se há logs de erro
    console.log('\n📋 5. Verificando logs de erro...');
    const [errorLogs] = await connection.execute(`
      SELECT * FROM import_logs 
      WHERE error_message LIKE '%${refId}%' 
         OR error_message LIKE '%imagem%'
         OR error_message LIKE '%image%'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (errorLogs.length > 0) {
      console.log('📋 Logs de erro encontrados:');
      console.table(errorLogs);
    } else {
      console.log('ℹ️ Nenhum log de erro encontrado');
    }
    
    // 6. Verificar se o produto foi importado recentemente
    console.log('\n⏰ 6. Verificando data de importação...');
    console.log(`  - Criado em: ${product.created_at}`);
    console.log(`  - Atualizado em: ${product.updated_at}`);
    
    // 7. Análise do problema
    console.log('\n🔍 7. Análise do problema:');
    console.log('📋 Possíveis causas para 0 imagens:');
    console.log('1. ❓ API VTEX não retorna imagens para estes SKUs');
    console.log('2. ❓ Método getSKUImages não está funcionando');
    console.log('3. ❓ Estrutura da resposta da API mudou');
    console.log('4. ❓ Erro na validação de image.Url');
    console.log('5. ❓ Erro na inserção no banco de dados');
    
    console.log('\n💡 Próximos passos para debug:');
    console.log('1. Testar API VTEX diretamente com um dos SKUs');
    console.log('2. Verificar se a resposta contém imagens');
    console.log('3. Verificar se os campos estão corretos');
    console.log('4. Testar inserção manual de uma imagem');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugSpecificProduct();
