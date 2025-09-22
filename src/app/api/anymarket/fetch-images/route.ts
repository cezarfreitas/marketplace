import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { anymarketId } = await request.json();

    if (!anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'anymarketId é obrigatório'
      }, { status: 400 });
    }

    console.log('🔍 Buscando imagens do produto no Anymarket:', anymarketId);

    // Buscar imagens do produto no Anymarket
    const anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
      method: 'GET',
      headers: {
        'gumgaToken': process.env.ANYMARKET || '',
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    console.log('📡 Resposta da API Anymarket:', {
      status: anymarketResponse.status,
      statusText: anymarketResponse.statusText,
      ok: anymarketResponse.ok
    });

    if (!anymarketResponse.ok) {
      const errorData = await anymarketResponse.json();
      console.error('❌ Erro na API do Anymarket:', errorData);
      
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar imagens no Anymarket: ' + (errorData.message || 'Erro desconhecido'),
        error: errorData
      }, { status: anymarketResponse.status });
    }

    const images = await anymarketResponse.json();
    console.log(`✅ ${images.length} imagens encontradas no Anymarket`);

    // Processar e formatar as imagens
    const processedImages = images.map((image: any, index: number) => ({
      id: image.id,
      index: image.index,
      main: image.main,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
      lowResolutionUrl: image.lowResolutionUrl,
      standardUrl: image.standardUrl,
      originalImage: image.originalImage,
      variation: image.variation || null,
      status: image.status,
      statusMessage: image.statusMessage || null,
      dimensions: {
        standard: {
          width: image.standardWidth,
          height: image.standardHeight
        },
        original: {
          width: image.originalWidth,
          height: image.originalHeight
        }
      },
      productId: image.productId
    }));

    return NextResponse.json({
      success: true,
      message: `${images.length} imagens encontradas no Anymarket`,
      data: {
        anymarketId: anymarketId,
        totalImages: images.length,
        images: processedImages,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar imagens do Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar imagens do Anymarket',
      error: error.message
    }, { status: 500 });
  }
}
