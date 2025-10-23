import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const anymarketToken = process.env.ANYMARKET || '';
    
    console.log('🔍 === DEBUG ANYMARKET LOGS ===');
    console.log('🔑 Token configurado:', anymarketToken ? 'SIM' : 'NÃO');
    console.log('🔑 Token (primeiros 20 chars):', anymarketToken.substring(0, 20) + '...');
    console.log('🌐 URL Base:', 'https://api.anymarket.com.br/v2');
    
    // Teste de conectividade básica
    console.log('🧪 Testando conectividade básica...');
    
    try {
      const testResponse = await fetch('https://api.anymarket.com.br/v2/products', {
        method: 'GET',
        headers: {
          'gumgaToken': anymarketToken,
          'Content-Type': 'application/json',
          'User-Agent': 'Meli-Integration/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      console.log('📡 Resposta do teste de conectividade:', {
        status: testResponse.status,
        statusText: testResponse.statusText,
        ok: testResponse.ok,
        headers: Object.fromEntries(testResponse.headers.entries())
      });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.log('❌ Erro na resposta:', errorText);
      } else {
        const testData = await testResponse.json();
        console.log('✅ Dados de teste recebidos:', testData);
      }
      
    } catch (testError: any) {
      console.error('❌ Erro no teste de conectividade:', testError);
    }
    
    // Teste específico com um produto
    const testProductId = '7045460064'; // ID que estava falhando nos logs
    
    console.log(`🧪 Testando produto específico: ${testProductId}`);
    
    try {
      const productResponse = await fetch(`https://api.anymarket.com.br/v2/products/${testProductId}`, {
        method: 'GET',
        headers: {
          'gumgaToken': anymarketToken,
          'Content-Type': 'application/json',
          'User-Agent': 'Meli-Integration/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      console.log('📡 Resposta do produto específico:', {
        status: productResponse.status,
        statusText: productResponse.statusText,
        ok: productResponse.ok,
        headers: Object.fromEntries(productResponse.headers.entries())
      });
      
      if (!productResponse.ok) {
        const errorText = await productResponse.text();
        console.log('❌ Erro na resposta do produto:', errorText);
      } else {
        const productData = await productResponse.json();
        console.log('✅ Dados do produto recebidos:', productData);
      }
      
    } catch (productError: any) {
      console.error('❌ Erro no teste do produto:', productError);
    }
    
    // Teste de upload de imagem
    console.log('🧪 Testando upload de imagem...');
    
    try {
      const testImageUrl = 'http://localhost:3000/uploads/crop-images/7045460064_vtex_35306781.jpg';
      
      const uploadResponse = await fetch(`https://api.anymarket.com.br/v2/products/${testProductId}/images`, {
        method: 'POST',
        headers: {
          'gumgaToken': anymarketToken,
          'Content-Type': 'application/json',
          'User-Agent': 'Meli-Integration/1.0',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          index: 1,
          main: true,
          url: testImageUrl
        })
      });
      
      console.log('📡 Resposta do upload de imagem:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        ok: uploadResponse.ok,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.log('❌ Erro no upload:', errorText);
      } else {
        const uploadData = await uploadResponse.json();
        console.log('✅ Upload bem-sucedido:', uploadData);
      }
      
    } catch (uploadError: any) {
      console.error('❌ Erro no teste de upload:', uploadError);
    }
    
    console.log('🔍 === FIM DEBUG ANYMARKET LOGS ===');
    
    return NextResponse.json({
      success: true,
      message: 'Logs de debug da Anymarket executados. Verifique o console do servidor.',
      debug: {
        tokenConfigured: !!anymarketToken,
        tokenPreview: anymarketToken.substring(0, 20) + '...',
        baseUrl: 'https://api.anymarket.com.br/v2',
        testProductId: testProductId
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro no debug da Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao executar debug da Anymarket',
      error: error.message
    }, { status: 500 });
  }
}
