const mysql = require('mysql2/promise');

async function checkProductsCount() {
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
    
    // 1. Contar produtos
    console.log('\n📦 1. Contando produtos...');
    const [productCount] = await connection.execute('SELECT COUNT(*) as total FROM products');
    const totalProducts = productCount[0].total;
    console.log(`📊 Total de produtos: ${totalProducts}`);
    
    // 2. Contar SKUs
    console.log('\n📋 2. Contando SKUs...');
    const [skuCount] = await connection.execute('SELECT COUNT(*) as total FROM skus');
    const totalSkus = skuCount[0].total;
    console.log(`📊 Total de SKUs: ${totalSkus}`);
    
    // 3. Contar imagens
    console.log('\n🖼️ 3. Contando imagens...');
    const [imageCount] = await connection.execute('SELECT COUNT(*) as total FROM images');
    const totalImages = imageCount[0].total;
    console.log(`📊 Total de imagens: ${totalImages}`);
    
    // 4. Contar marcas
    console.log('\n🏷️ 4. Contando marcas...');
    const [brandCount] = await connection.execute('SELECT COUNT(*) as total FROM brands');
    const totalBrands = brandCount[0].total;
    console.log(`📊 Total de marcas: ${totalBrands}`);
    
    // 5. Contar categorias
    console.log('\n📂 5. Contando categorias...');
    const [categoryCount] = await connection.execute('SELECT COUNT(*) as total FROM categories');
    const totalCategories = categoryCount[0].total;
    console.log(`📊 Total de categorias: ${totalCategories}`);
    
    // 6. Contar dados do marketplace
    console.log('\n🛒 6. Contando dados do marketplace...');
    const [meliCount] = await connection.execute('SELECT COUNT(*) as total FROM meli');
    const totalMeli = meliCount[0].total;
    console.log(`📊 Total de registros do marketplace: ${totalMeli}`);
    
    // 7. Contar logs de análise
    console.log('\n🔍 7. Contando logs de análise...');
    const [analysisCount] = await connection.execute('SELECT COUNT(*) as total FROM image_analysis_logs');
    const totalAnalysis = analysisCount[0].total;
    console.log(`📊 Total de logs de análise: ${totalAnalysis}`);
    
    // 8. Contar dados do anymarket
    console.log('\n🌐 8. Contando dados do anymarket...');
    const [anymarketCount] = await connection.execute('SELECT COUNT(*) as total FROM anymarket');
    const totalAnymarket = anymarketCount[0].total;
    console.log(`📊 Total de registros do anymarket: ${totalAnymarket}`);
    
    // 9. Resumo geral
    console.log('\n📋 9. Resumo geral:');
    console.log(`   - Produtos: ${totalProducts}`);
    console.log(`   - SKUs: ${totalSkus}`);
    console.log(`   - Imagens: ${totalImages}`);
    console.log(`   - Marcas: ${totalBrands}`);
    console.log(`   - Categorias: ${totalCategories}`);
    console.log(`   - Marketplace: ${totalMeli}`);
    console.log(`   - Análises: ${totalAnalysis}`);
    console.log(`   - Anymarket: ${totalAnymarket}`);
    
    // 10. Aviso sobre limpeza
    if (totalProducts > 0) {
      console.log('\n⚠️ ATENÇÃO: Existem dados no banco!');
      console.log('💡 Para limpar todos os produtos, execute o script de limpeza.');
    } else {
      console.log('\n✅ Banco de dados já está vazio.');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkProductsCount();
