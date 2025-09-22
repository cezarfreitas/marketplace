// Script para testar o endpoint get-skus
const http = require('http');

const postData = JSON.stringify({
  anymarketId: 220371246 // ID do produto "Meia Stance OG Cinza" no Anymarket
});

const options = {
  hostname: 'localhost',
  port: 3001, // Usando porta 3001 onde o servidor está rodando
  path: '/api/anymarket/get-skus',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testando endpoint /api/anymarket/get-skus...');
console.log('📤 Dados enviados:', postData);
console.log('🌐 URL:', `http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  console.log(`📡 Status: ${res.statusCode} ${res.statusMessage}`);
  console.log(`📊 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📥 Resposta recebida:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      // Mostrar informações específicas dos SKUs
      if (jsonData.success && jsonData.data && jsonData.data.skus) {
        console.log('\n📦 SKUs encontrados:');
        jsonData.data.skus.forEach((sku, index) => {
          console.log(`   ${index + 1}. ID: ${sku.id}`);
          console.log(`      Título: ${sku.title}`);
          console.log(`      Partner ID: ${sku.partnerId}`);
          console.log(`      Preço: ${sku.price}`);
          console.log(`      Estoque: ${sku.amount}`);
          console.log(`      Ativo: ${sku.active}`);
          if (sku.variations) {
            console.log(`      Variações: ${JSON.stringify(sku.variations)}`);
          }
          console.log('');
        });
      }
    } catch (e) {
      console.log('Resposta (não é JSON):', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error);
});

req.write(postData);
req.end();
