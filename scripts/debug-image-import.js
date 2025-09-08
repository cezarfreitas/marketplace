const mysql = require('mysql2/promise');

async function debugImageImport() {
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
    
    console.log('🖼️ Debugando importação de imagens...');
    
    // 1. Verificar produtos e seus SKUs
    console.log('\n📦 Verificando produtos e SKUs...');
    const [products] = await connection.execute(`
      SELECT p.id, p.name, p.ref_id, p.vtex_id, COUNT(s.id) as sku_count
      FROM products p
      LEFT JOIN skus s ON p.id = s.product_id
      GROUP BY p.id
      ORDER BY p.id
    `);
    
    console.log('📋 Produtos e contagem de SKUs:');
    console.table(products);
    
    // 2. Verificar SKUs detalhados
    console.log('\n📋 Verificando SKUs detalhados...');
    const [skus] = await connection.execute(`
      SELECT s.id, s.vtex_id, s.product_id, s.name_complete, p.name as product_name, p.ref_id
      FROM skus s
      JOIN products p ON s.product_id = p.id
      ORDER BY s.product_id, s.id
    `);
    
    console.log('📋 SKUs encontrados:');
    console.table(skus);
    
    // 3. Verificar imagens importadas
    console.log('\n🖼️ Verificando imagens importadas...');
    const [images] = await connection.execute(`
      SELECT pi.id, pi.product_id, pi.image_url, pi.image_name, p.name as product_name, p.ref_id
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      ORDER BY pi.product_id, pi.id
    `);
    
    if (images.length > 0) {
      console.log('📋 Imagens encontradas:');
      console.table(images);
    } else {
      console.log('❌ Nenhuma imagem encontrada na tabela product_images');
    }
    
    // 4. Verificar se há imagens por produto
    console.log('\n📊 Estatísticas de imagens por produto...');
    const [imageStats] = await connection.execute(`
      SELECT 
        p.id,
        p.name,
        p.ref_id,
        COUNT(pi.id) as image_count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      GROUP BY p.id
      ORDER BY p.id
    `);
    
    console.log('📊 Contagem de imagens por produto:');
    console.table(imageStats);
    
    // 5. Verificar se há imagens por SKU
    console.log('\n📊 Estatísticas de imagens por SKU...');
    const [skuImageStats] = await connection.execute(`
      SELECT 
        s.id as sku_id,
        s.vtex_id as sku_vtex_id,
        s.name_complete,
        p.name as product_name,
        p.ref_id,
        COUNT(pi.id) as image_count
      FROM skus s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      GROUP BY s.id
      ORDER BY s.product_id, s.id
    `);
    
    console.log('📊 Contagem de imagens por SKU:');
    console.table(skuImageStats);
    
    // 6. Verificar se o primeiro SKU tem imagens
    if (skus.length > 0) {
      const firstSku = skus[0];
      console.log(`\n🔍 Analisando primeiro SKU: ${firstSku.name_complete} (VTEX ID: ${firstSku.vtex_id})`);
      
      // Verificar se há imagens para este SKU específico
      const [skuImages] = await connection.execute(`
        SELECT * FROM product_images 
        WHERE product_id = ? 
        ORDER BY id
      `, [firstSku.product_id]);
      
      if (skuImages.length > 0) {
        console.log(`✅ Primeiro SKU tem ${skuImages.length} imagens:`);
        console.table(skuImages);
      } else {
        console.log(`❌ Primeiro SKU não tem imagens importadas`);
      }
    }
    
    // 7. Verificar estrutura da tabela product_images
    console.log('\n🔍 Verificando estrutura da tabela product_images...');
    const [structure] = await connection.execute('DESCRIBE product_images');
    console.log('📋 Estrutura da tabela product_images:');
    console.table(structure);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugImageImport();
