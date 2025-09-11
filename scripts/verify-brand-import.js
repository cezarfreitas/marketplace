const mysql = require('mysql2/promise');

async function verifyBrandImport() {
  let connection;
  
  try {
    // Configuração do banco de dados
    const dbConfig = {
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      port: parseInt(process.env.DB_PORT) || 3342,
      user: process.env.DB_USER || 'seo_data',
      password: process.env.DB_PASSWORD || '54779042baaa70be95c0',
      database: process.env.DB_NAME || 'seo_data',
      charset: 'utf8mb4'
    };

    console.log('🔗 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado!\n');

    // 1. Verificar marcas importadas
    console.log('🔍 1. Verificando marcas importadas...');
    const [brands] = await connection.execute('SELECT * FROM brands_vtex ORDER BY vtex_id');
    
    console.log(`📊 Total de marcas: ${brands.length}`);
    if (brands.length > 0) {
      console.log('📋 Marcas encontradas:');
      brands.forEach((brand, index) => {
        console.log(`   ${index + 1}. ID: ${brand.vtex_id}, Nome: ${brand.name}, Ativo: ${brand.is_active ? 'Sim' : 'Não'}`);
        if (brand.title) console.log(`      Título: ${brand.title}`);
        if (brand.meta_tag_description) console.log(`      Descrição: ${brand.meta_tag_description}`);
        if (brand.image_url) console.log(`      Imagem: ${brand.image_url}`);
      });
    }

    // 2. Verificar produtos e suas marcas
    console.log('\n🔍 2. Verificando produtos e suas marcas...');
    const [products] = await connection.execute(`
      SELECT 
        p.vtex_id,
        p.name as product_name,
        p.ref_id,
        p.brand_id,
        b.name as brand_name,
        b.is_active as brand_active
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.brand_id = b.id
      ORDER BY p.vtex_id
    `);
    
    console.log(`📊 Total de produtos: ${products.length}`);
    if (products.length > 0) {
      console.log('📋 Produtos e suas marcas:');
      products.forEach((product, index) => {
        const brandInfo = product.brand_name ? 
          `${product.brand_name} (ID: ${product.brand_id}, Ativo: ${product.brand_active ? 'Sim' : 'Não'})` : 
          'Sem marca';
        console.log(`   ${index + 1}. ${product.product_name}`);
        console.log(`      RefId: ${product.ref_id}, Marca: ${brandInfo}`);
      });
    }

    // 3. Verificar especificamente a marca Tropical Brasil (ID 2000061)
    console.log('\n🔍 3. Verificando marca Tropical Brasil (ID 2000061)...');
    const [tropicalBrand] = await connection.execute('SELECT * FROM brands_vtex WHERE vtex_id = 2000061');
    
    if (tropicalBrand.length > 0) {
      const brand = tropicalBrand[0];
      console.log('✅ Marca Tropical Brasil encontrada!');
      console.log('📋 Dados da marca:');
      console.log(`   - ID VTEX: ${brand.vtex_id}`);
      console.log(`   - Nome: ${brand.name}`);
      console.log(`   - Ativo: ${brand.is_active ? 'Sim' : 'Não'}`);
      console.log(`   - Título: ${brand.title || 'N/A'}`);
      console.log(`   - Descrição: ${brand.meta_tag_description || 'N/A'}`);
      console.log(`   - Imagem: ${brand.image_url || 'N/A'}`);
      console.log(`   - Criado em: ${brand.created_at}`);
      console.log(`   - Atualizado em: ${brand.updated_at}`);
    } else {
      console.log('❌ Marca Tropical Brasil não encontrada');
    }

    // 4. Verificar se o produto ECKBERM0220C1 está associado à marca correta
    console.log('\n🔍 4. Verificando associação produto-marca...');
    const [productBrand] = await connection.execute(`
      SELECT 
        p.vtex_id,
        p.name as product_name,
        p.ref_id,
        p.brand_id,
        b.name as brand_name
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.brand_id = b.id
      WHERE p.ref_id = 'ECKBERM0220C1'
    `);
    
    if (productBrand.length > 0) {
      const product = productBrand[0];
      console.log('✅ Produto ECKBERM0220C1 encontrado!');
      console.log('📋 Associação produto-marca:');
      console.log(`   - Produto: ${product.product_name}`);
      console.log(`   - RefId: ${product.ref_id}`);
      console.log(`   - Brand ID: ${product.brand_id}`);
      console.log(`   - Brand Name: ${product.brand_name || 'N/A'}`);
      
      if (product.brand_id === 2000061 && product.brand_name === 'Tropical Brasil') {
        console.log('🎉 Associação produto-marca está correta!');
      } else {
        console.log('⚠️ Associação produto-marca pode estar incorreta');
      }
    } else {
      console.log('❌ Produto ECKBERM0220C1 não encontrado');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

verifyBrandImport();
