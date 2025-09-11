const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkBrandsCategories() {
  let connection;
  
  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: process.env.DB_PORT || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data'
    });

    console.log('✅ Conectado ao banco de dados!');

    // Verificar marcas disponíveis
    console.log('🔍 Verificando marcas disponíveis...');
    const [brands] = await connection.execute(`
      SELECT * FROM brands ORDER BY id
    `);
    
    console.log(`📊 Total de marcas: ${brands.length}`);
    if (brands.length > 0) {
      console.log('\n📋 Marcas disponíveis:');
      brands.forEach((brand, index) => {
        console.log(`${index + 1}. ID: ${brand.id} - Nome: "${brand.name}"`);
      });
    }

    // Verificar categorias disponíveis
    console.log('\n🔍 Verificando categorias disponíveis...');
    const [categories] = await connection.execute(`
      SELECT * FROM categories ORDER BY id
    `);
    
    console.log(`📊 Total de categorias: ${categories.length}`);
    if (categories.length > 0) {
      console.log('\n📋 Categorias disponíveis:');
      categories.forEach((category, index) => {
        console.log(`${index + 1}. ID: ${category.id} - Nome: "${category.name}"`);
      });
    }

    // Verificar o produto específico
    console.log('\n🔍 Verificando produto específico...');
    const [product] = await connection.execute(`
      SELECT * FROM products_vtex WHERE id = 203716023
    `);
    
    if (product.length > 0) {
      const p = product[0];
      console.log('📦 Dados do produto:');
      console.log(`  - ID: ${p.id}`);
      console.log(`  - Nome: "${p.name}"`);
      console.log(`  - Brand ID: ${p.brand_id}`);
      console.log(`  - Category ID: ${p.category_id}`);
      console.log(`  - Title: "${p.title || 'N/A'}"`);
      
      // Verificar se os IDs existem nas tabelas
      if (p.brand_id) {
        const [brandCheck] = await connection.execute(`
          SELECT * FROM brands WHERE id = ?
        `, [p.brand_id]);
        
        if (brandCheck.length > 0) {
          console.log(`  ✅ Marca encontrada: "${brandCheck[0].name}"`);
        } else {
          console.log(`  ❌ Marca não encontrada para ID: ${p.brand_id}`);
        }
      }
      
      if (p.category_id) {
        const [categoryCheck] = await connection.execute(`
          SELECT * FROM categories WHERE id = ?
        `, [p.category_id]);
        
        if (categoryCheck.length > 0) {
          console.log(`  ✅ Categoria encontrada: "${categoryCheck[0].name}"`);
        } else {
          console.log(`  ❌ Categoria não encontrada para ID: ${p.category_id}`);
        }
      }
    }

    // Verificar se há produtos com marcas e categorias válidas
    console.log('\n🔍 Verificando produtos com marcas e categorias válidas...');
    const [productsWithValidData] = await connection.execute(`
      SELECT 
        p.id, p.name, p.brand_id, p.category_id,
        b.name as brand_name,
        c.name as category_name
      FROM products_vtex p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE b.name IS NOT NULL OR c.name IS NOT NULL
      LIMIT 5
    `);
    
    console.log(`📊 Produtos com dados válidos: ${productsWithValidData.length}`);
    if (productsWithValidData.length > 0) {
      console.log('\n📋 Produtos com marcas/categorias válidas:');
      productsWithValidData.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   - Marca: "${product.brand_name || 'N/A'}"`);
        console.log(`   - Categoria: "${product.category_name || 'N/A'}"`);
      });
    }

    console.log('\n🎉 Verificação de marcas e categorias concluída!');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkBrandsCategories()
    .then(() => {
      console.log('🎉 Verificação executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = { checkBrandsCategories };
