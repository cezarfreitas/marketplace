// Script para testar a deleção de imagens do Anymarket
// Uso: node test-anymarket-deletion.js

const https = require('https');

// Configurações - substitua pelos seus valores
const ANYMARKET_TOKEN = 'MjU5MDYwMTI2Lg==.0LQYQdD1msxFvlKDn30l+QB96Xan5RtlLNVPWupoZnEkphpS8do3oMONXWofAVCpmC7Cgit5YrVHBFKQkTHdHQ==';
const PRODUCT_ID = 'SEU_PRODUCT_ID_AQUI'; // Substitua pelo ID do produto
const IMAGE_ID = 'SEU_IMAGE_ID_AQUI'; // Substitua pelo ID da imagem

function makeRequest(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'gumgaToken': ANYMARKET_TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0',
        ...headers
      }
    };

    console.log(`🔄 ${method} ${url}`);
    console.log(`🔑 Headers:`, {
      ...options.headers,
      gumgaToken: options.headers.gumgaToken ? 'Configurado' : 'Não configurado'
    });

    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📡 Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`📊 Headers de resposta:`, res.headers);
        
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, raw: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro na requisição:', error);
      reject(error);
    });

    req.end();
  });
}

async function testImageDeletion() {
  try {
    console.log('🧪 Iniciando teste de deleção de imagem do Anymarket\n');

    // 1. Buscar imagens do produto
    console.log('1️⃣ Buscando imagens do produto...');
    const getImagesUrl = `https://api.anymarket.com.br/v2/products/${PRODUCT_ID}/images`;
    const imagesResponse = await makeRequest(getImagesUrl, 'GET');
    
    if (imagesResponse.status !== 200) {
      console.error(`❌ Erro ao buscar imagens: ${imagesResponse.status}`);
      console.log('Resposta:', imagesResponse.data);
      return;
    }

    const images = Array.isArray(imagesResponse.data) ? imagesResponse.data : imagesResponse.data.data || [];
    console.log(`✅ Encontradas ${images.length} imagens:`);
    images.forEach((img, index) => {
      console.log(`   ${index + 1}. ID: ${img.id}, URL: ${img.url || 'N/A'}`);
    });

    if (images.length === 0) {
      console.log('⚠️ Nenhuma imagem encontrada no produto');
      return;
    }

    // 2. Usar a primeira imagem para teste se IMAGE_ID não foi especificado
    const testImageId = IMAGE_ID === 'SEU_IMAGE_ID_AQUI' ? images[0].id : IMAGE_ID;
    const targetImage = images.find(img => img.id == testImageId);
    
    if (!targetImage) {
      console.error(`❌ Imagem com ID ${testImageId} não encontrada`);
      return;
    }

    console.log(`\n2️⃣ Testando deleção da imagem ID: ${testImageId}`);
    console.log(`   URL da imagem: ${targetImage.url || 'N/A'}`);

    // 3. Tentar deletar a imagem
    const deleteUrl = `https://api.anymarket.com.br/v2/products/${PRODUCT_ID}/images/${testImageId}`;
    const deleteResponse = await makeRequest(deleteUrl, 'DELETE');

    console.log(`\n3️⃣ Resultado da deleção:`);
    console.log(`   Status: ${deleteResponse.status}`);
    
    if (deleteResponse.status === 204) {
      console.log('✅ Imagem deletada com sucesso (204 No Content)');
    } else if (deleteResponse.status === 200) {
      console.log('✅ Imagem deletada com sucesso (200 OK)');
    } else {
      console.log(`⚠️ Resposta inesperada: ${deleteResponse.status}`);
      console.log('Resposta:', deleteResponse.data);
    }

    // 4. Verificar se a imagem foi realmente deletada
    console.log(`\n4️⃣ Verificando se a imagem foi removida...`);
    const verifyResponse = await makeRequest(getImagesUrl, 'GET');
    
    if (verifyResponse.status === 200) {
      const updatedImages = Array.isArray(verifyResponse.data) ? verifyResponse.data : verifyResponse.data.data || [];
      const imageStillExists = updatedImages.find(img => img.id == testImageId);
      
      console.log(`   Imagens restantes: ${updatedImages.length}`);
      if (imageStillExists) {
        console.log('⚠️ A imagem ainda existe após a deleção');
      } else {
        console.log('✅ Imagem foi removida com sucesso');
      }
    } else {
      console.log(`⚠️ Erro ao verificar: ${verifyResponse.status}`);
    }

    console.log('\n🎉 Teste concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Verificar se as configurações foram alteradas
if (PRODUCT_ID === 'SEU_PRODUCT_ID_AQUI') {
  console.log('❌ Configure o PRODUCT_ID no script antes de executar');
  console.log('   Edite o arquivo e substitua "SEU_PRODUCT_ID_AQUI" pelo ID real do produto');
  process.exit(1);
}

testImageDeletion();
