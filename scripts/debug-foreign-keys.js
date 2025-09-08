const mysql = require('mysql2/promise');

async function debugForeignKeys() {
  let connection;
  
  try {
    // Configuração do banco de dados
    const dbConfig = {
      host: 'server.idenegociosdigitais.com.br',
      port: 3349,
      user: 'meli',
      password: '7dd3e59ddb3c3a5da0e3',
      database: 'meli',
      charset: 'utf8mb4'
    };

    console.log('🔍 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Verificar foreign keys da tabela products
    console.log('\n🔍 Verificando foreign keys da tabela products...');
    const [foreignKeys] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'meli' 
        AND TABLE_NAME = 'products' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('📋 Foreign keys da tabela products:');
    console.table(foreignKeys);
    
    // 2. Verificar produtos com brand_id que não existem na tabela brands
    console.log('\n🔍 Verificando produtos com brand_id inválido...');
    const [invalidBrandIds] = await connection.execute(`
      SELECT DISTINCT p.brand_id, COUNT(*) as count
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.brand_id IS NOT NULL AND b.id IS NULL
      GROUP BY p.brand_id
    `);
    
    if (invalidBrandIds.length > 0) {
      console.log('❌ Produtos com brand_id inválido:');
      console.table(invalidBrandIds);
    } else {
      console.log('✅ Todos os brand_ids são válidos');
    }
    
    // 3. Verificar produtos com category_id que não existem na tabela categories
    console.log('\n🔍 Verificando produtos com category_id inválido...');
    const [invalidCategoryIds] = await connection.execute(`
      SELECT DISTINCT p.category_id, COUNT(*) as count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id IS NOT NULL AND c.id IS NULL
      GROUP BY p.category_id
    `);
    
    if (invalidCategoryIds.length > 0) {
      console.log('❌ Produtos com category_id inválido:');
      console.table(invalidCategoryIds);
    } else {
      console.log('✅ Todos os category_ids são válidos');
    }
    
    // 4. Verificar marcas existentes
    console.log('\n🔍 Verificando marcas existentes...');
    const [brands] = await connection.execute('SELECT id, vtex_id, name FROM brands ORDER BY id');
    console.log(`📋 Total de marcas: ${brands.length}`);
    console.table(brands.slice(0, 10)); // Mostrar apenas as primeiras 10
    
    // 5. Verificar categorias existentes
    console.log('\n🔍 Verificando categorias existentes...');
    const [categories] = await connection.execute('SELECT id, vtex_id, name FROM categories ORDER BY id');
    console.log(`📋 Total de categorias: ${categories.length}`);
    console.table(categories.slice(0, 10)); // Mostrar apenas as primeiras 10
    
    // 6. Verificar produtos que estão falhando
    console.log('\n🔍 Verificando produtos que estão falhando...');
    const failingRefIds = ['ECKCAMM15U021', 'ECKCAMM15U031', 'ECKCAMM1480G1', 'ECKCAMM15T031', 'ECKCAMM14V0B1', 'ECKCAMM1010L1', 'ECKCAMM12H0J1'];
    
    for (const refId of failingRefIds) {
      const [products] = await connection.execute(
        'SELECT id, name, ref_id, brand_id, category_id FROM products WHERE ref_id = ?',
        [refId]
      );
      
      if (products.length > 0) {
        const product = products[0];
        console.log(`\n📦 Produto ${refId}:`);
        console.log(`  - ID: ${product.id}`);
        console.log(`  - Name: ${product.name}`);
        console.log(`  - Brand ID: ${product.brand_id}`);
        console.log(`  - Category ID: ${product.category_id}`);
        
        // Verificar se brand_id existe
        if (product.brand_id) {
          const [brandExists] = await connection.execute(
            'SELECT id, name FROM brands WHERE id = ?',
            [product.brand_id]
          );
          if (brandExists.length === 0) {
            console.log(`  ❌ Brand ID ${product.brand_id} não existe na tabela brands`);
          } else {
            console.log(`  ✅ Brand ID ${product.brand_id} existe: ${brandExists[0].name}`);
          }
        }
        
        // Verificar se category_id existe
        if (product.category_id) {
          const [categoryExists] = await connection.execute(
            'SELECT id, name FROM categories WHERE id = ?',
            [product.category_id]
          );
          if (categoryExists.length === 0) {
            console.log(`  ❌ Category ID ${product.category_id} não existe na tabela categories`);
          } else {
            console.log(`  ✅ Category ID ${product.category_id} existe: ${categoryExists[0].name}`);
          }
        }
      } else {
        console.log(`❌ Produto ${refId} não encontrado no banco`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugForeignKeys();
