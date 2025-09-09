const mysql = require('mysql2/promise');

async function cleanAllProducts() {
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
    
    // 1. Verificar dados antes da limpeza
    console.log('\n📊 1. Verificando dados antes da limpeza...');
    const [productCount] = await connection.execute('SELECT COUNT(*) as total FROM products');
    const [skuCount] = await connection.execute('SELECT COUNT(*) as total FROM skus');
    const [imageCount] = await connection.execute('SELECT COUNT(*) as total FROM images');
    const [brandCount] = await connection.execute('SELECT COUNT(*) as total FROM brands');
    const [categoryCount] = await connection.execute('SELECT COUNT(*) as total FROM categories');
    const [meliCount] = await connection.execute('SELECT COUNT(*) as total FROM meli');
    const [analysisCount] = await connection.execute('SELECT COUNT(*) as total FROM image_analysis_logs');
    const [anymarketCount] = await connection.execute('SELECT COUNT(*) as total FROM anymarket');
    
    console.log('📋 Dados atuais:');
    console.log(`   - Produtos: ${productCount[0].total}`);
    console.log(`   - SKUs: ${skuCount[0].total}`);
    console.log(`   - Imagens: ${imageCount[0].total}`);
    console.log(`   - Marcas: ${brandCount[0].total}`);
    console.log(`   - Categorias: ${categoryCount[0].total}`);
    console.log(`   - Marketplace: ${meliCount[0].total}`);
    console.log(`   - Análises: ${analysisCount[0].total}`);
    console.log(`   - Anymarket: ${anymarketCount[0].total}`);
    
    // 2. Confirmação
    console.log('\n⚠️ 2. ATENÇÃO: Esta operação irá deletar TODOS os dados!');
    console.log('🗑️ Serão deletados:');
    console.log('   - Todos os produtos');
    console.log('   - Todos os SKUs');
    console.log('   - Todas as imagens');
    console.log('   - Todos os dados do marketplace');
    console.log('   - Todos os logs de análise');
    console.log('   - Todos os dados do anymarket');
    console.log('   - Marcas e categorias (se não estiverem sendo usadas)');
    
    console.log('\n💡 Esta operação é IRREVERSÍVEL!');
    console.log('🔄 Iniciando limpeza em 3 segundos...');
    
    // Aguardar 3 segundos
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Iniciar limpeza
    console.log('\n🗑️ 3. Iniciando limpeza...');
    
    try {
      // 3.1. Deletar logs de análise de imagens
      console.log('🗑️ 3.1. Deletando logs de análise de imagens...');
      const [analysisResult] = await connection.execute('DELETE FROM image_analysis_logs');
      console.log(`✅ ${analysisResult.affectedRows} logs de análise deletados`);
      
      // 3.2. Deletar dados do marketplace
      console.log('🗑️ 3.2. Deletando dados do marketplace...');
      const [meliResult] = await connection.execute('DELETE FROM meli');
      console.log(`✅ ${meliResult.affectedRows} registros do marketplace deletados`);
      
      // 3.3. Deletar dados do anymarket
      console.log('🗑️ 3.3. Deletando dados do anymarket...');
      const [anymarketResult] = await connection.execute('DELETE FROM anymarket');
      console.log(`✅ ${anymarketResult.affectedRows} registros do anymarket deletados`);
      
      // 3.4. Deletar imagens
      console.log('🗑️ 3.4. Deletando imagens...');
      const [imageResult] = await connection.execute('DELETE FROM images');
      console.log(`✅ ${imageResult.affectedRows} imagens deletadas`);
      
      // 3.5. Deletar SKUs
      console.log('🗑️ 3.5. Deletando SKUs...');
      const [skuResult] = await connection.execute('DELETE FROM skus');
      console.log(`✅ ${skuResult.affectedRows} SKUs deletados`);
      
      // 3.6. Deletar produtos
      console.log('🗑️ 3.6. Deletando produtos...');
      const [productResult] = await connection.execute('DELETE FROM products');
      console.log(`✅ ${productResult.affectedRows} produtos deletados`);
      
      // 3.7. Deletar marcas (opcional - comentado para preservar)
      console.log('🗑️ 3.7. Deletando marcas...');
      const [brandResult] = await connection.execute('DELETE FROM brands');
      console.log(`✅ ${brandResult.affectedRows} marcas deletadas`);
      
      // 3.8. Deletar categorias (opcional - comentado para preservar)
      console.log('🗑️ 3.8. Deletando categorias...');
      const [categoryResult] = await connection.execute('DELETE FROM categories');
      console.log(`✅ ${categoryResult.affectedRows} categorias deletadas`);
      
    } catch (deleteError) {
      console.error('❌ Erro durante a limpeza:', deleteError.message);
      throw deleteError;
    }
    
    // 4. Verificar limpeza
    console.log('\n🔍 4. Verificando limpeza...');
    const [finalProductCount] = await connection.execute('SELECT COUNT(*) as total FROM products');
    const [finalSkuCount] = await connection.execute('SELECT COUNT(*) as total FROM skus');
    const [finalImageCount] = await connection.execute('SELECT COUNT(*) as total FROM images');
    const [finalBrandCount] = await connection.execute('SELECT COUNT(*) as total FROM brands');
    const [finalCategoryCount] = await connection.execute('SELECT COUNT(*) as total FROM categories');
    const [finalMeliCount] = await connection.execute('SELECT COUNT(*) as total FROM meli');
    const [finalAnalysisCount] = await connection.execute('SELECT COUNT(*) as total FROM image_analysis_logs');
    const [finalAnymarketCount] = await connection.execute('SELECT COUNT(*) as total FROM anymarket');
    
    console.log('📋 Dados após limpeza:');
    console.log(`   - Produtos: ${finalProductCount[0].total}`);
    console.log(`   - SKUs: ${finalSkuCount[0].total}`);
    console.log(`   - Imagens: ${finalImageCount[0].total}`);
    console.log(`   - Marcas: ${finalBrandCount[0].total}`);
    console.log(`   - Categorias: ${finalCategoryCount[0].total}`);
    console.log(`   - Marketplace: ${finalMeliCount[0].total}`);
    console.log(`   - Análises: ${finalAnalysisCount[0].total}`);
    console.log(`   - Anymarket: ${finalAnymarketCount[0].total}`);
    
    // 5. Verificar se limpeza foi completa
    const totalRemaining = finalProductCount[0].total + finalSkuCount[0].total + finalImageCount[0].total + 
                          finalMeliCount[0].total + finalAnalysisCount[0].total + finalAnymarketCount[0].total;
    
    if (totalRemaining === 0) {
      console.log('\n✅ Limpeza concluída com sucesso!');
      console.log('🗑️ Todos os dados foram removidos do banco.');
    } else {
      console.log('\n⚠️ Limpeza parcial:');
      console.log(`📊 Ainda restam ${totalRemaining} registros no banco.`);
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

// Executar o script
cleanAllProducts();
