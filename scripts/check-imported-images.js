const mysql = require('mysql2/promise');
const { config } = require('dotenv');

config();

const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3349'),
  user: process.env.DB_USER || 'meli',
  password: process.env.DB_PASSWORD || '7dd3e59ddb3c3a5da0e3',
  database: process.env.DB_NAME || 'meli',
};

async function checkImportedImages() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados MySQL');

    // Verificar imagens importadas
    console.log('\n🖼️ Verificando imagens importadas...');
    const [images] = await connection.execute(`
      SELECT i.id, i.vtex_id, i.name, i.is_main, i.position, i.url, i.sku_id, s.sku_name, p.name as product_name, p.ref_id
      FROM images i
      LEFT JOIN skus s ON i.sku_id = s.id
      LEFT JOIN products p ON s.product_id = p.id
      ORDER BY i.created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 Total de imagens encontradas: ${images.length}`);
    images.forEach((image, index) => {
      console.log(`\n${index + 1}. ID: ${image.id}`);
      console.log(`   VTEX ID: ${image.vtex_id}`);
      console.log(`   Nome: ${image.name}`);
      console.log(`   Principal: ${image.is_main ? 'Sim' : 'Não'}`);
      console.log(`   Posição: ${image.position}`);
      console.log(`   URL: ${image.url ? image.url.substring(0, 80) + '...' : 'N/A'}`);
      console.log(`   SKU: ${image.sku_name}`);
      console.log(`   Produto: ${image.product_name} (RefId: ${image.ref_id})`);
    });

    // Verificar SKUs com imagens
    console.log('\n📋 Verificando SKUs com imagens...');
    const [skusWithImages] = await connection.execute(`
      SELECT s.id, s.sku_name, p.name as product_name, p.ref_id, COUNT(i.id) as image_count
      FROM skus s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN images i ON s.id = i.sku_id
      GROUP BY s.id, s.sku_name, p.name, p.ref_id
      HAVING image_count > 0
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    console.log(`\n📊 SKUs com imagens: ${skusWithImages.length}`);
    skusWithImages.forEach((sku, index) => {
      console.log(`\n${index + 1}. SKU: ${sku.sku_name}`);
      console.log(`   Produto: ${sku.product_name} (RefId: ${sku.ref_id})`);
      console.log(`   Imagens: ${sku.image_count}`);
    });

    // Verificar relacionamentos completos com imagens
    console.log('\n🔗 Verificando relacionamentos completos com imagens...');
    const [complete] = await connection.execute(`
      SELECT p.name as product_name, p.ref_id,
             b.name as brand_name,
             c.name as category_name,
             COUNT(DISTINCT s.id) as sku_count,
             COUNT(DISTINCT i.id) as image_count
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN skus s ON p.id = s.product_id
      LEFT JOIN images i ON s.id = i.sku_id
      WHERE p.brand_id IS NOT NULL AND p.category_id IS NOT NULL
      GROUP BY p.id, p.name, p.ref_id, b.name, c.name
      ORDER BY p.created_at DESC
      LIMIT 3
    `);

    console.log(`\n📊 Produtos com relacionamentos completos: ${complete.length}`);
    complete.forEach((item, index) => {
      console.log(`\n${index + 1}. Produto: ${item.product_name}`);
      console.log(`   RefId: ${item.ref_id}`);
      console.log(`   Marca: ${item.brand_name}`);
      console.log(`   Categoria: ${item.category_name}`);
      console.log(`   SKUs: ${item.sku_count}`);
      console.log(`   Imagens: ${item.image_count}`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar imagens:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkImportedImages();
