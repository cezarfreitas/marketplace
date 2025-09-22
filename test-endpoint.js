// Script para testar o endpoint get-product
const http = require('http');

const postData = JSON.stringify({
  productId: 203705747
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/anymarket/get-product',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testando endpoint /api/anymarket/get-product...');
console.log('📤 Dados enviados:', postData);

const req = http.request(options, (res) => {
  console.log(`📡 Status: ${res.statusCode} ${res.statusMessage}`);
  console.log(`📊 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📥 Resposta recebida:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error);
});

req.write(postData);
req.end();
