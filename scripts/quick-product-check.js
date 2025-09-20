const mysql = require('mysql2/promise');

async function quickProductCheck() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado!');

    // Buscar produtos Stance
    const [products] = await connection.execute(`
      SELECT 
        p.id_produto_vtex,
        p.ref_id,
        p.name,
        p.title,
        b.name as brand_name,
        c.name as category_name
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
      LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
      WHERE b.name LIKE '%Stance%' OR p.name LIKE '%Stance%'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log(`\n📊 Produtos Stance encontrados: ${products.length}`);
    
    if (products.length > 0) {
      products.forEach((product, index) => {
        console.log(`\n${index + 1}. ID: ${product.id_produto_vtex}`);
        console.log(`   Nome: ${product.name || 'N/A'}`);
        console.log(`   Título: ${product.title || 'N/A'}`);
        console.log(`   Marca: ${product.brand_name || 'N/A'}`);
        console.log(`   Categoria: ${product.category_name || 'N/A'}`);
      });
    } else {
      console.log('❌ Nenhum produto Stance encontrado');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

quickProductCheck();
