import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { anymarketId, imageId } = await request.json();

    if (!anymarketId || !imageId) {
      return NextResponse.json({
        success: false,
        message: 'anymarketId e imageId são obrigatórios'
      }, { status: 400 });
    }

    const anymarketToken = process.env.ANYMARKET || '';
    
    if (!anymarketToken) {
      return NextResponse.json({
        success: false,
        message: 'Token do Anymarket não configurado'
      }, { status: 400 });
    }

    console.log(`🧪 Testando deleção de imagem ${imageId} do produto ${anymarketId}`);
    console.log(`🔑 Token configurado: ${anymarketToken ? 'Sim' : 'Não'}`);

    // 1. Primeiro, buscar as imagens para verificar se a imagem existe
    console.log('🔍 Buscando imagens do produto...');
    const getImagesResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
      method: 'GET',
      headers: {
        'gumgaToken': anymarketToken,
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!getImagesResponse.ok) {
      return NextResponse.json({
        success: false,
        message: `Erro ao buscar imagens: ${getImagesResponse.status} - ${getImagesResponse.statusText}`,
        details: await getImagesResponse.text()
      }, { status: getImagesResponse.status });
    }

    const images = await getImagesResponse.json();
    console.log(`📊 Encontradas ${images.length} imagens no produto`);

    const targetImage = images.find((img: any) => img.id === parseInt(imageId));
    
    if (!targetImage) {
      return NextResponse.json({
        success: false,
        message: `Imagem com ID ${imageId} não encontrada no produto`,
        availableImages: images.map((img: any) => ({ id: img.id, url: img.url }))
      }, { status: 404 });
    }

    console.log(`🎯 Imagem encontrada: ${targetImage.id} - ${targetImage.url}`);

    // 2. Tentar deletar a imagem
    console.log('🗑️ Tentando deletar a imagem...');
    const deleteResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images/${imageId}`, {
      method: 'DELETE',
      headers: {
        'gumgaToken': anymarketToken,
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0'
      }
    });

    console.log(`📡 Resposta da API: ${deleteResponse.status} ${deleteResponse.statusText}`);

    if (deleteResponse.ok) {
      // Verificar se a imagem foi realmente deletada
      console.log('✅ Deleção bem-sucedida, verificando se a imagem foi removida...');
      
      const verifyResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
        method: 'GET',
        headers: {
          'gumgaToken': anymarketToken,
          'Content-Type': 'application/json',
          'User-Agent': 'Meli-Integration/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (verifyResponse.ok) {
        const updatedImages = await verifyResponse.json();
        const imageStillExists = updatedImages.find((img: any) => img.id === parseInt(imageId));
        
        return NextResponse.json({
          success: true,
          message: `Imagem ${imageId} deletada com sucesso`,
          details: {
            originalImageCount: images.length,
            currentImageCount: updatedImages.length,
            imageStillExists: !!imageStillExists,
            deletedImage: {
              id: targetImage.id,
              url: targetImage.url
            }
          }
        });
      } else {
        return NextResponse.json({
          success: true,
          message: `Imagem ${imageId} deletada (não foi possível verificar)`,
          warning: `Erro ao verificar: ${verifyResponse.status}`
        });
      }
    } else {
      const errorText = await deleteResponse.text();
      console.error(`❌ Erro ao deletar: ${deleteResponse.status} - ${errorText}`);
      
      return NextResponse.json({
        success: false,
        message: `Erro ao deletar imagem: ${deleteResponse.status} - ${deleteResponse.statusText}`,
        details: {
          status: deleteResponse.status,
          statusText: deleteResponse.statusText,
          errorBody: errorText,
          requestHeaders: {
            'gumgaToken': anymarketToken ? 'Configurado' : 'Não configurado',
            'Content-Type': 'application/json',
            'User-Agent': 'Meli-Integration/1.0'
          }
        }
      }, { status: deleteResponse.status });
    }

  } catch (error: any) {
    console.error('❌ Erro no teste de deleção:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}
