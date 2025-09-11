const mysql = require('mysql2/promise');

async function checkProductBrandId() {
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

    // Verificar o BrandId do produto ECKBERM0220C1
    console.log('🔍 Verificando BrandId do produto ECKBERM0220C1...');
    const [product] = await connection.execute(`
      SELECT vtex_id, name, ref_id, brand_id, department_id, category_id
      FROM products_vtex 
      WHERE ref_id = 'ECKBERM0220C1'
    `);
    
    if (product.length > 0) {
      const p = product[0];
      console.log('📋 Dados do produto:');
      console.log(`   - ID VTEX: ${p.vtex_id}`);
      console.log(`   - Nome: ${p.name}`);
      console.log(`   - RefId: ${p.ref_id}`);
      console.log(`   - Brand ID: ${p.brand_id}`);
      console.log(`   - Department ID: ${p.department_id}`);
      console.log(`   - Category ID: ${p.category_id}`);
      
      if (p.brand_id) {
        console.log(`\n🔍 Verificando se a marca ${p.brand_id} existe...`);
        const [brand] = await connection.execute('SELECT * FROM brands_vtex WHERE vtex_id = ?', [p.brand_id]);
        
        if (brand.length > 0) {
          console.log('✅ Marca encontrada!');
          console.log(`   - Nome: ${brand[0].name}`);
          console.log(`   - Ativo: ${brand[0].is_active ? 'Sim' : 'Não'}`);
        } else {
          console.log('❌ Marca não encontrada no banco!');
          console.log(`   Precisa importar a marca ID: ${p.brand_id}`);
        }
      } else {
        console.log('⚠️ Produto não possui Brand ID');
      }
    } else {
      console.log('❌ Produto ECKBERM0220C1 não encontrado');
    }

    // Verificar todos os produtos e seus BrandIds
    console.log('\n🔍 Verificando todos os produtos e seus BrandIds...');
    const [allProducts] = await connection.execute(`
      SELECT vtex_id, name, ref_id, brand_id
      FROM products_vtex 
      ORDER BY vtex_id
    `);
    
    console.log(`📊 Total de produtos: ${allProducts.length}`);
    allProducts.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name} (RefId: ${p.ref_id}, BrandId: ${p.brand_id || 'N/A'})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

checkProductBrandId();
