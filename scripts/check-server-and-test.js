const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkServerAndTest() {
  try {
    console.log('🔍 Verificando se o servidor está rodando...');
    
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
    
    // 2. Testar importação com produto FATBERM06H021
    console.log('\n🚀 Testando importação integrada com estoque...');
    
    const refId = 'FATBERM06H021';
    const apiUrl = 'http://localhost:3000/api/import/products';
    
    const requestData = {
      refId: refId,
      importImages: true
    };
    
    console.log(`📦 Importando produto: ${refId}`);
    console.log('📤 Enviando requisição...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    console.log(`📥 Resposta: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Importação realizada com sucesso!');
      
      if (responseData.data) {
        console.log('\n📊 Resumo da importação:');
        console.log(`   - Produto: ${responseData.data.productName}`);
        console.log(`   - SKUs: ${responseData.data.skuCount}`);
        console.log(`   - Imagens: ${responseData.data.imageCount}`);
        console.log(`   - Estoque: ${responseData.data.stockCount} registros`);
        console.log(`   - SKUs com estoque: ${responseData.data.stockSuccessCount}`);
        console.log(`   - Erros de estoque: ${responseData.data.stockErrorCount}`);
        
        if (responseData.data.stock && responseData.data.stock.length > 0) {
          console.log('\n📦 Dados de estoque importados:');
          responseData.data.stock.forEach((stock, index) => {
            console.log(`  ${index + 1}. SKU ${stock.skuId} - ${stock.warehouseName}: ${stock.totalQuantity} unidades`);
          });
        }
      }
    } else {
      const errorData = await response.json();
      console.log('❌ Erro na importação:', errorData.message || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar teste:', error.message);
  }
}

// Executar o script
checkServerAndTest();
