const mysql = require('mysql2/promise');

async function debugFATBERM06H021() {
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
    console.log(`  - Is Active: ${product.is_active}`);
    console.log(`  - Is Visible: ${product.is_visible}`);
    console.log(`  - Created At: ${product.created_at}`);
    
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
    
    // 3. Verificar imagens do produto (tabela images)
    console.log('\n🖼️ 3. Verificando imagens na tabela images...');
    const [images] = await connection.execute(`
      SELECT 
        i.id,
        i.sku_id,
        i.vtex_id,
        i.archive_id,
        i.name,
        i.is_main,
        i.url,
        i.file_location,
        i.position,
        i.created_at,
        s.name_complete as sku_name
      FROM images i
      JOIN skus s ON i.sku_id = s.id
      WHERE s.product_id = ?
      ORDER BY i.created_at DESC
    `, [product.id]);
    
    console.log(`📊 Encontradas ${images.length} imagens na tabela images:`);
    images.forEach((image, index) => {
      console.log(`  ${index + 1}. Image ID: ${image.id}, SKU: ${image.sku_name}, Archive ID: ${image.archive_id}, URL: ${image.url}, File Location: ${image.file_location}`);
    });
    
    // 4. Verificar imagens do produto (tabela product_images se existir)
    console.log('\n🖼️ 4. Verificando imagens na tabela product_images...');
    try {
      const [productImages] = await connection.execute(`
        SELECT 
          pi.id,
          pi.product_id,
          pi.image_url,
          pi.image_name,
          pi.file_id,
          pi.created_at
        FROM product_images pi
        WHERE pi.product_id = ?
        ORDER BY pi.created_at DESC
      `, [product.id]);
      
      console.log(`📊 Encontradas ${productImages.length} imagens na tabela product_images:`);
      productImages.forEach((image, index) => {
        console.log(`  ${index + 1}. Image ID: ${image.id}, File ID: ${image.file_id}, URL: ${image.image_url}`);
      });
    } catch (error) {
      console.log('❌ Tabela product_images não existe ou erro ao consultar:', error.message);
    }
    
    // 5. Verificar se existe na tabela anymarket
    console.log('\n🌐 5. Verificando na tabela anymarket...');
    const [anymarket] = await connection.execute(
      'SELECT * FROM anymarket WHERE ref_id = ?',
      [refId]
    );
    
    if (anymarket.length > 0) {
      console.log('✅ Produto encontrado na tabela anymarket:');
      console.log(`  - ID ANY: ${anymarket[0].id_any}`);
      console.log(`  - Ref ID: ${anymarket[0].ref_id}`);
    } else {
      console.log('❌ Produto não encontrado na tabela anymarket');
    }
    
    // 6. Verificar logs de análise de imagem
    console.log('\n🔍 6. Verificando logs de análise de imagem...');
    const [analysisLogs] = await connection.execute(
      'SELECT * FROM image_analysis_logs WHERE product_id = ? ORDER BY created_at DESC',
      [product.id]
    );
    
    console.log(`📊 Encontrados ${analysisLogs.length} logs de análise:`);
    analysisLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. Log ID: ${log.id}, Status: ${log.status}, Created: ${log.created_at}`);
    });
    
    // 7. Verificar dados do marketplace
    console.log('\n🛒 7. Verificando dados do marketplace...');
    const [marketplace] = await connection.execute(
      'SELECT * FROM meli WHERE product_id = ? ORDER BY created_at DESC',
      [product.id]
    );
    
    console.log(`📊 Encontrados ${marketplace.length} registros do marketplace:`);
    marketplace.forEach((meli, index) => {
      console.log(`  ${index + 1}. ID: ${meli.id}, Title: ${meli.title}, Created: ${meli.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugFATBERM06H021();
