const mysql = require('mysql2/promise');

async function checkStanceProduct() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Buscar produto específico da Stance
    console.log('\n🔍 Buscando "Camiseta Stance Estampa Logo Verde Militar"...');
    
    const [products] = await connection.execute(`
      SELECT 
        p.id_produto_vtex,
        p.ref_id,
        p.name,
        p.description,
        p.title,
        p.keywords,
        p.is_active,
        b.name as brand_name,
        c.name as category_name
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
      LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
      WHERE (p.name LIKE '%Stance%' OR p.title LIKE '%Stance%' OR p.description LIKE '%Stance%')
      AND (p.name LIKE '%Verde%' OR p.title LIKE '%Verde%' OR p.description LIKE '%Verde%')
      AND (p.name LIKE '%Militar%' OR p.title LIKE '%Militar%' OR p.description LIKE '%Militar%')
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    if (products.length === 0) {
      console.log('❌ Produto específico não encontrado');
      
      // Buscar produtos Stance em geral
      console.log('\n🔍 Buscando produtos Stance em geral...');
      const [stanceProducts] = await connection.execute(`
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
        WHERE b.name LIKE '%Stance%' OR p.name LIKE '%Stance%' OR p.title LIKE '%Stance%'
        ORDER BY p.created_at DESC
        LIMIT 10
      `);
      
      if (stanceProducts.length > 0) {
        console.log(`\n📊 Encontrados ${stanceProducts.length} produtos Stance:`);
        stanceProducts.forEach((product, index) => {
          console.log(`\n${index + 1}. ID: ${product.id_produto_vtex}`);
          console.log(`   Ref ID: ${product.ref_id || 'N/A'}`);
          console.log(`   Nome: ${product.name || 'N/A'}`);
          console.log(`   Título: ${product.title || 'N/A'}`);
          console.log(`   Marca: ${product.brand_name || 'N/A'}`);
          console.log(`   Categoria: ${product.category_name || 'N/A'}`);
        });
      } else {
        console.log('❌ Nenhum produto Stance encontrado no banco');
      }
      
      return;
    }

    console.log(`\n📊 Encontrados ${products.length} produtos similares:`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 PRODUTO ${i + 1}:`);
      console.log(`${'='.repeat(60)}`);
      console.log(`ID: ${product.id_produto_vtex}`);
      console.log(`Ref ID: ${product.ref_id || 'N/A'}`);
      console.log(`Nome: ${product.name || 'N/A'}`);
      console.log(`Título: ${product.title || 'N/A'}`);
      console.log(`Marca: ${product.brand_name || 'N/A'}`);
      console.log(`Categoria: ${product.category_name || 'N/A'}`);
      console.log(`Ativo: ${product.is_active ? 'Sim' : 'Não'}`);
      
      // Verificar SKUs
      const [skus] = await connection.execute(`
        SELECT COUNT(*) as count FROM skus_vtex WHERE id_produto_vtex = ?
      `, [product.id_produto_vtex]);
      
      console.log(`SKUs: ${skus[0].count}`);
      
      // Verificar imagens
      const [images] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM images_vtex i
        INNER JOIN skus_vtex s ON i.id_sku_vtex = s.id_sku_vtex
        WHERE s.id_produto_vtex = ?
      `, [product.id_produto_vtex]);
      
      console.log(`Imagens: ${images[0].count}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkStanceProduct()
    .then(() => {
      console.log('\n🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = { checkStanceProduct };
