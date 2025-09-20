const mysql = require('mysql2/promise');

async function getProductDetails() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Usar credenciais hardcoded como fallback
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Buscar produtos da marca Stance na categoria Camisetas
    console.log('\n🔍 Buscando produtos da marca Stance na categoria Camisetas...');
    
    const [products] = await connection.execute(`
      SELECT 
        p.id_produto_vtex,
        p.ref_id,
        p.name,
        p.description,
        p.title,
        p.keywords,
        p.is_active,
        p.created_at,
        p.updated_at,
        b.name as brand_name,
        c.name as category_name
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
      LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
      WHERE b.name LIKE '%Stance%' 
      AND c.name LIKE '%Camisetas%'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    if (products.length === 0) {
      console.log('❌ Nenhum produto encontrado para marca Stance na categoria Camisetas');
      
      // Buscar todas as marcas disponíveis
      console.log('\n🔍 Buscando marcas disponíveis...');
      const [brands] = await connection.execute(`
        SELECT DISTINCT name 
        FROM brands_vtex 
        WHERE name LIKE '%Stance%' OR name LIKE '%stance%'
        ORDER BY name
      `);
      
      if (brands.length > 0) {
        console.log('📋 Marcas similares encontradas:');
        brands.forEach(brand => console.log(`   - ${brand.name}`));
      }
      
      // Buscar todas as categorias disponíveis
      console.log('\n🔍 Buscando categorias disponíveis...');
      const [categories] = await connection.execute(`
        SELECT DISTINCT name 
        FROM categories_vtex 
        WHERE name LIKE '%Camisetas%' OR name LIKE '%camisetas%' OR name LIKE '%Camiseta%'
        ORDER BY name
      `);
      
      if (categories.length > 0) {
        console.log('📋 Categorias similares encontradas:');
        categories.forEach(category => console.log(`   - ${category.name}`));
      }
      
      return;
    }

    console.log(`\n📊 Encontrados ${products.length} produtos:`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 PRODUTO ${i + 1}:`);
      console.log(`${'='.repeat(60)}`);
      console.log(`ID: ${product.id_produto_vtex}`);
      console.log(`Ref ID: ${product.ref_id || 'N/A'}`);
      console.log(`Nome: ${product.name || 'N/A'}`);
      console.log(`Marca: ${product.brand_name || 'N/A'}`);
      console.log(`Categoria: ${product.category_name || 'N/A'}`);
      console.log(`Título: ${product.title || 'N/A'}`);
      console.log(`Descrição: ${product.description ? product.description.substring(0, 100) + '...' : 'N/A'}`);
      console.log(`Palavras-chave: ${product.keywords || 'N/A'}`);
      console.log(`Ativo: ${product.is_active ? 'Sim' : 'Não'}`);
      console.log(`Criado: ${product.created_at}`);
      console.log(`Atualizado: ${product.updated_at}`);
      
      // Buscar SKUs para este produto
      const [skus] = await connection.execute(`
        SELECT 
          id_sku_vtex,
          sku_id,
          name,
          is_active,
          created_at
        FROM skus_vtex 
        WHERE id_produto_vtex = ?
        ORDER BY created_at DESC
      `, [product.id_produto_vtex]);
      
      console.log(`\n📋 SKUs (${skus.length}):`);
      if (skus.length === 0) {
        console.log('   ❌ Nenhum SKU encontrado');
      } else {
        skus.forEach((sku, index) => {
          console.log(`   ${index + 1}. ID: ${sku.id_sku_vtex} | SKU: ${sku.sku_id} | Nome: ${sku.name} | Ativo: ${sku.is_active ? 'Sim' : 'Não'}`);
        });
      }
      
      // Buscar imagens para este produto
      const [images] = await connection.execute(`
        SELECT 
          i.id_photo_vtex,
          i.file_location,
          i.text as alt_text,
          i.is_main,
          i.name,
          i.label,
          i.position,
          s.sku_id
        FROM images_vtex i
        INNER JOIN skus_vtex s ON i.id_sku_vtex = s.id_sku_vtex
        WHERE s.id_produto_vtex = ?
        ORDER BY i.is_main DESC, i.position ASC
      `, [product.id_produto_vtex]);
      
      console.log(`\n🖼️ Imagens (${images.length}):`);
      if (images.length === 0) {
        console.log('   ❌ Nenhuma imagem encontrada');
      } else {
        images.forEach((image, index) => {
          console.log(`   ${index + 1}. ID: ${image.id_photo_vtex} | Principal: ${image.is_main ? 'Sim' : 'Não'} | Posição: ${image.position}`);
          console.log(`      URL: ${image.file_location}`);
          console.log(`      Alt: ${image.alt_text || 'N/A'}`);
          console.log(`      SKU: ${image.sku_id}`);
        });
      }
    }

    // Se houver apenas um produto, mostrar detalhes completos
    if (products.length === 1) {
      const product = products[0];
      console.log(`\n${'='.repeat(80)}`);
      console.log('📋 DETALHES COMPLETOS DO PRODUTO:');
      console.log(`${'='.repeat(80)}`);
      console.log(JSON.stringify(product, null, 2));
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
  getProductDetails()
    .then(() => {
      console.log('\n🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = { getProductDetails };
