import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { anymarketId, imageUrl, index, main } = await request.json();

    if (!anymarketId || !imageUrl) {
      return NextResponse.json({
        success: false,
        message: 'anymarketId e imageUrl são obrigatórios'
      }, { status: 400 });
    }

    const anymarketToken = process.env.ANYMARKET || '';
    
    if (!anymarketToken) {
      return NextResponse.json({
        success: false,
        message: 'Token do Anymarket não configurado'
      }, { status: 400 });
    }

    console.log(`📤 Enviando imagem para Anymarket:`, {
      anymarketId,
      imageUrl,
      index,
      main
    });

    const anymarketUploadResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
      method: 'POST',
      headers: {
        'gumgaToken': anymarketToken,
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0'
      },
      body: JSON.stringify({
        index: index || 1,
        main: main || false,
        url: imageUrl
      })
    });

    if (anymarketUploadResponse.ok) {
      const result = await anymarketUploadResponse.json();
      console.log(`✅ Imagem enviada para Anymarket com sucesso:`, result);
      
      return NextResponse.json({
        success: true,
        message: 'Imagem enviada para Anymarket com sucesso',
        data: {
          anymarketId,
          imageUrl,
          index,
          main,
          anymarketResponse: result
        }
      });
    } else {
      const errorText = await anymarketUploadResponse.text();
      console.error(`❌ Erro ao enviar imagem para Anymarket: ${anymarketUploadResponse.status} - ${errorText}`);
      
      return NextResponse.json({
        success: false,
        message: `Erro ao enviar imagem para Anymarket: ${anymarketUploadResponse.status} - ${errorText}`,
        error: {
          status: anymarketUploadResponse.status,
          statusText: anymarketUploadResponse.statusText,
          details: errorText
        }
      }, { status: anymarketUploadResponse.status });
    }

  } catch (error: any) {
    console.error('❌ Erro ao enviar imagem para Anymarket:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao enviar imagem para Anymarket',
      error: error.message
    }, { status: 500 });
  }
}
