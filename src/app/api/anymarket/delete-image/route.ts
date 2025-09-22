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

    console.log(`🗑️ Deletando imagem ${imageId} do produto ${anymarketId}`);

    const deleteResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images/${imageId}`, {
      method: 'DELETE',
      headers: {
        'gumgaToken': anymarketToken,
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0'
      }
    });

    if (deleteResponse.ok) {
      console.log(`✅ Imagem ${imageId} deletada com sucesso`);
      return NextResponse.json({
        success: true,
        message: `Imagem ${imageId} deletada com sucesso`,
        data: {
          imageId,
          anymarketId,
          deleted: true
        }
      });
    } else {
      const errorText = await deleteResponse.text();
      console.error(`❌ Erro ao deletar imagem ${imageId}: ${deleteResponse.status} - ${errorText}`);
      return NextResponse.json({
        success: false,
        message: `Erro ao deletar imagem: ${deleteResponse.status} - ${errorText}`,
        error: {
          status: deleteResponse.status,
          statusText: deleteResponse.statusText,
          details: errorText
        }
      }, { status: deleteResponse.status });
    }

  } catch (error: any) {
    console.error('❌ Erro ao deletar imagem do Anymarket:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao deletar imagem',
      error: error.message
    }, { status: 500 });
  }
}
