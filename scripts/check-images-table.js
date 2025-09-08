// Verificar tabela images
const mysql = require('mysql2/promise');

async function checkImagesTable() {
  console.log('🔍 Verificando tabela images...');
  
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
    
    // Verificar estrutura da tabela images
    console.log('\n📋 Estrutura da tabela images:');
    const [structure] = await connection.execute('DESCRIBE images');
    console.table(structure);
    
    // Contar total de imagens
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM images');
    const totalImages = countResult[0].total;
    console.log(`\n📊 Total de imagens na tabela images: ${totalImages}`);
    
    if (totalImages > 0) {
      // Mostrar algumas imagens de exemplo
      console.log('\n🖼️ Exemplos de imagens na tabela images:');
      const [images] = await connection.execute(`
        SELECT 
          i.id,
          i.vtex_id,
          i.archive_id,
          i.sku_id,
          i.name,
          i.is_main,
          i.url,
          i.file_location,
          i.position,
          i.created_at
        FROM images i
        ORDER BY i.created_at DESC
        LIMIT 10
      `);
      
      console.table(images);
      
      // Verificar imagens por SKU
      console.log('\n📊 Imagens por SKU:');
      const [imagesBySku] = await connection.execute(`
        SELECT 
          i.sku_id,
          COUNT(i.id) as image_count,
          GROUP_CONCAT(i.file_location SEPARATOR ', ') as file_locations
        FROM images i
        GROUP BY i.sku_id
        ORDER BY image_count DESC
        LIMIT 10
      `);
      
      console.table(imagesBySku);
      
    } else {
      console.log('❌ Nenhuma imagem encontrada na tabela images');
    }
    
    // Comparar com product_images
    console.log('\n🔍 Comparando com tabela product_images:');
    const [productImagesCount] = await connection.execute('SELECT COUNT(*) as total FROM product_images');
    console.log(`📊 Total de imagens na tabela product_images: ${productImagesCount[0].total}`);
    
    await connection.end();
    console.log('\n✅ Verificação concluída');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkImagesTable();
