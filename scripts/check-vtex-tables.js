// Script para verificar as tabelas VTEX criadas
const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3349,
  user: 'meli',
  password: '7dd3e59ddb3c3a5da0e3',
  database: 'meli',
  charset: 'utf8mb4'
};

async function checkVtexTables() {
  console.log('🔍 Verificando tabelas VTEX...');
  
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar tabela brands_vtex
    console.log('\n🏷️ === TABELA BRANDS_VTEX ===');
    const [brandsCount] = await connection.execute('SELECT COUNT(*) as total FROM brands_vtex');
    console.log(`📊 Total de marcas: ${brandsCount[0].total}`);
    
    if (brandsCount[0].total > 0) {
      const [brands] = await connection.execute(`
        SELECT vtex_id, name, is_active, title, created_at 
        FROM brands_vtex 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log('📋 Últimas marcas importadas:');
      console.table(brands);
    }
    
    // Verificar tabela images_vtex
    console.log('\n🖼️ === TABELA IMAGES_VTEX ===');
    const [imagesCount] = await connection.execute('SELECT COUNT(*) as total FROM images_vtex');
    console.log(`📊 Total de imagens: ${imagesCount[0].total}`);
    
    if (imagesCount[0].total > 0) {
      const [images] = await connection.execute(`
        SELECT vtex_id, sku_id, name, is_main, position, created_at 
        FROM images_vtex 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log('📋 Últimas imagens importadas:');
      console.table(images);
      
      // Estatísticas por SKU
      const [imagesBySku] = await connection.execute(`
        SELECT 
          sku_id,
          COUNT(*) as total_images,
          SUM(CASE WHEN is_main = 1 THEN 1 ELSE 0 END) as main_images
        FROM images_vtex 
        GROUP BY sku_id 
        ORDER BY total_images DESC 
        LIMIT 5
      `);
      console.log('📊 Imagens por SKU:');
      console.table(imagesBySku);
    }
    
    // Verificar relacionamentos
    console.log('\n🔗 === RELACIONAMENTOS ===');
    
    // Verificar se há SKUs com imagens
    const [skusWithImages] = await connection.execute(`
      SELECT COUNT(DISTINCT sku_id) as skus_with_images 
      FROM images_vtex
    `);
    console.log(`📊 SKUs com imagens: ${skusWithImages[0].skus_with_images}`);
    
    // Verificar se há marcas com produtos
    const [brandsWithProducts] = await connection.execute(`
      SELECT COUNT(DISTINCT bv.vtex_id) as brands_with_products
      FROM brands_vtex bv
      INNER JOIN brands b ON bv.vtex_id = b.vtex_id
    `);
    console.log(`📊 Marcas com produtos: ${brandsWithProducts[0].brands_with_products}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco encerrada');
    }
  }
}

checkVtexTables();
