const mysql = require('mysql2/promise');

async function checkBrandAssociation() {
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

    // 1. Verificar estrutura das tabelas
    console.log('🔍 1. Verificando estrutura das tabelas...');
    
    console.log('📋 Estrutura da tabela products_vtex:');
    const [productColumns] = await connection.execute('DESCRIBE products_vtex');
    productColumns.forEach(col => {
      if (col.Field.includes('brand')) {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Key ? `[${col.Key}]` : ''}`);
      }
    });
    
    console.log('\n📋 Estrutura da tabela brands_vtex:');
    const [brandColumns] = await connection.execute('DESCRIBE brands_vtex');
    brandColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // 2. Verificar dados das marcas
    console.log('\n🔍 2. Verificando dados das marcas...');
    const [brands] = await connection.execute('SELECT * FROM brands_vtex ORDER BY vtex_id');
    console.log(`📊 Total de marcas: ${brands.length}`);
    brands.forEach(brand => {
      console.log(`   - ID: ${brand.id}, VTEX ID: ${brand.vtex_id}, Nome: ${brand.name}`);
    });

    // 3. Verificar dados dos produtos
    console.log('\n🔍 3. Verificando dados dos produtos...');
    const [products] = await connection.execute('SELECT vtex_id, name, ref_id, brand_id FROM products_vtex ORDER BY vtex_id');
    console.log(`📊 Total de produtos: ${products.length}`);
    products.forEach(product => {
      console.log(`   - VTEX ID: ${product.vtex_id}, RefId: ${product.ref_id}, Brand ID: ${product.brand_id}`);
    });

    // 4. Testar associação correta
    console.log('\n🔍 4. Testando associação produto-marca...');
    const [associations] = await connection.execute(`
      SELECT 
        p.vtex_id as product_vtex_id,
        p.name as product_name,
        p.ref_id,
        p.brand_id as product_brand_id,
        b.id as brand_internal_id,
        b.vtex_id as brand_vtex_id,
        b.name as brand_name
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.brand_id = b.vtex_id
      ORDER BY p.vtex_id
    `);
    
    console.log('📋 Associações produto-marca:');
    associations.forEach(assoc => {
      const status = assoc.brand_name ? '✅' : '❌';
      console.log(`   ${status} ${assoc.product_name} (${assoc.ref_id})`);
      console.log(`      Produto Brand ID: ${assoc.product_brand_id}`);
      console.log(`      Marca encontrada: ${assoc.brand_name || 'N/A'} (ID: ${assoc.brand_internal_id}, VTEX ID: ${assoc.brand_vtex_id})`);
    });

    // 5. Verificar se há inconsistências
    console.log('\n🔍 5. Verificando inconsistências...');
    const [inconsistencies] = await connection.execute(`
      SELECT 
        p.vtex_id,
        p.name,
        p.ref_id,
        p.brand_id
      FROM products_vtex p
      WHERE p.brand_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM brands_vtex b WHERE b.vtex_id = p.brand_id
      )
    `);
    
    if (inconsistencies.length > 0) {
      console.log(`⚠️ Produtos com marcas não encontradas: ${inconsistencies.length}`);
      inconsistencies.forEach(prod => {
        console.log(`   - ${prod.name} (${prod.ref_id}): Brand ID ${prod.brand_id} não encontrado`);
      });
    } else {
      console.log('✅ Todas as marcas dos produtos estão corretas!');
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

checkBrandAssociation();
