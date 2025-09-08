// Verificar imagens no banco de dados
const mysql = require('mysql2/promise');

async function checkImagesInDatabase() {
  console.log('🔍 Verificando imagens no banco de dados...');
  
  const dbConfig = {
    host: 'server.idenegociosdigitais.com.br',
    port: 3349,
    user: 'meli',
    password: '7dd3e59ddb3c3a5da0e3',
    database: 'meli',
    charset: 'utf8mb4'
  };
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar estrutura da tabela product_images
    console.log('\n📋 Estrutura da tabela product_images:');
    const [structure] = await connection.execute('DESCRIBE product_images');
    console.table(structure);
    
    // Contar total de imagens
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM product_images');
    const totalImages = countResult[0].total;
    console.log(`\n📊 Total de imagens no banco: ${totalImages}`);
    
    if (totalImages > 0) {
      // Mostrar algumas imagens de exemplo
      console.log('\n🖼️ Exemplos de imagens no banco:');
      const [images] = await connection.execute(`
        SELECT 
          pi.id,
          pi.product_id,
          p.name as product_name,
          p.ref_id,
          pi.image_url,
          pi.image_name,
          pi.file_id,
          pi.created_at
        FROM product_images pi
        LEFT JOIN products p ON pi.product_id = p.id
        ORDER BY pi.created_at DESC
        LIMIT 10
      `);
      
      console.table(images);
      
      // Verificar imagens do produto específico ECKCAMM12H0J1
      console.log('\n🔍 Verificando imagens do produto ECKCAMM12H0J1:');
      const [productImages] = await connection.execute(`
        SELECT 
          pi.id,
          pi.product_id,
          p.name as product_name,
          p.ref_id,
          pi.image_url,
          pi.image_name,
          pi.file_id,
          pi.created_at
        FROM product_images pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE p.ref_id = 'ECKCAMM12H0J1'
        ORDER BY pi.created_at DESC
      `);
      
      if (productImages.length > 0) {
        console.log(`✅ Encontradas ${productImages.length} imagens para o produto ECKCAMM12H0J1:`);
        console.table(productImages);
      } else {
        console.log('❌ Nenhuma imagem encontrada para o produto ECKCAMM12H0J1');
      }
      
      // Verificar imagens por produto
      console.log('\n📊 Imagens por produto:');
      const [imagesByProduct] = await connection.execute(`
        SELECT 
          p.ref_id,
          p.name as product_name,
          COUNT(pi.id) as image_count
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id
        GROUP BY p.id, p.ref_id, p.name
        HAVING image_count > 0
        ORDER BY image_count DESC
        LIMIT 10
      `);
      
      console.table(imagesByProduct);
      
    } else {
      console.log('❌ Nenhuma imagem encontrada no banco de dados');
    }
    
    await connection.end();
    console.log('\n✅ Verificação concluída');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkImagesInDatabase();
