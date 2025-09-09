const fetch = require('node-fetch');

async function importImagesViaAPI() {
  try {
    console.log('🚀 Iniciando importação de imagens via API...');
    
    const refId = 'FATBERM06H021';
    console.log(`📦 Importando imagens para o produto: ${refId}`);
    
    // URL da API de importação
    const apiUrl = 'http://localhost:3000/api/import/products';
    
    // Dados para enviar
    const requestData = {
      refId: refId,
      importImages: true
    };
    
    console.log('📤 Enviando requisição para a API...');
    console.log('URL:', apiUrl);
    console.log('Dados:', JSON.stringify(requestData, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('📥 Resposta recebida:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const responseData = await response.json();
    console.log('📋 Dados da resposta:');
    console.log(JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ Importação realizada com sucesso!');
    } else {
      console.log('❌ Erro na importação:', responseData.message || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar importação via API:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar o script
importImagesViaAPI();
