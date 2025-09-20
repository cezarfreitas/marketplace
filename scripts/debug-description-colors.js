// Script para debugar as cores do botão de descrição
const fetch = require('node-fetch');

async function debugDescriptionColors() {
  console.log('🐛 Debugando cores do botão de descrição...\n');

  try {
    // 1. Verificar dados da API
    console.log('1️⃣ Verificando dados da API...');
    const response = await fetch('http://localhost:3000/api/descriptions?status=generated&limit=1000');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API funcionando');
      console.log(`📊 Total de descrições: ${data.data ? data.data.length : 0}`);
      
      if (data.data && data.data.length > 0) {
        const productIds = data.data.map((item) => item.id_product_vtex);
        console.log('📋 IDs dos produtos com descrição:', productIds);
        
        // 2. Simular a lógica do frontend
        console.log('\n2️⃣ Simulando lógica do frontend...');
        const testProductIds = [203708463, 203721946, 999, 1000];
        
        testProductIds.forEach(productId => {
          const hasDescription = productIds.includes(productId);
          console.log(`  Produto ${productId}: ${hasDescription ? '🟡 AMARELO' : '⚪ CINZA'}`);
        });
        
        // 3. Verificar tipos de dados
        console.log('\n3️⃣ Verificando tipos de dados...');
        console.log('Tipo dos IDs na API:', typeof productIds[0]);
        console.log('Tipo do produto de teste:', typeof 203708463);
        console.log('Comparação estrita:', productIds[0] === 203708463);
        console.log('Comparação com ==:', productIds[0] == 203708463);
        
        // 4. Verificar se há problemas de tipo
        console.log('\n4️⃣ Verificando conversão de tipos...');
        const convertedIds = productIds.map(id => parseInt(id));
        console.log('IDs convertidos para int:', convertedIds);
        
        testProductIds.forEach(productId => {
          const hasDescription = convertedIds.includes(productId);
          console.log(`  Produto ${productId} (convertido): ${hasDescription ? '🟡 AMARELO' : '⚪ CINZA'}`);
        });
        
      } else {
        console.log('❌ Nenhuma descrição encontrada');
      }
    } else {
      console.log('❌ Erro na API:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

debugDescriptionColors();
