const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkProductsPage() {
  try {
    console.log('🔍 Verificando se a página de produtos está funcionando...');
    
    // 1. Verificar se o servidor está rodando
    const healthUrl = 'http://localhost:3000/api/health';
    
    try {
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        timeout: 5000
      });
      
      if (healthResponse.ok) {
        console.log('✅ Servidor está rodando!');
      } else {
        console.log('⚠️ Servidor respondeu com status:', healthResponse.status);
      }
    } catch (error) {
      console.log('❌ Servidor não está rodando ou não responde');
      console.log('💡 Para iniciar o servidor, execute: npm run dev');
      return;
    }
    
    // 2. Testar API de produtos com estoque
    console.log('\n📦 Testando API de produtos com estoque...');
    
    const productsUrl = 'http://localhost:3000/api/products?limit=5';
    
    const response = await fetch(productsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API de produtos funcionando!');
      
      if (data.success && data.data && data.data.products) {
        console.log('\n📊 Produtos com estoque:');
        
        data.data.products.forEach((product, index) => {
          const stockStatus = product.total_stock > 0 ? '✅' : '❌';
          console.log(`${index + 1}. ${stockStatus} ${product.name} - Estoque: ${product.total_stock || 0}`);
        });
        
        console.log('\n🌐 Para ver a interface:');
        console.log('   Abra: http://localhost:3000/products');
        console.log('   O estoque deve aparecer ao lado do nome do produto');
      }
    } else {
      console.log('❌ Erro na API de produtos:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar página:', error.message);
  }
}

// Executar o script
checkProductsPage();
