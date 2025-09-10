import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { productId, anymarketId } = await request.json();

    console.log('🧪 Teste de crop em lote iniciado');
    console.log('📋 Dados recebidos:', { productId, anymarketId });

    if (!productId || !anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'productId e anymarketId são obrigatórios'
      }, { status: 400 });
    }

    // Simular processamento com delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('✅ Teste de crop em lote concluído com sucesso');

    return NextResponse.json({
      success: true,
      message: `Teste de crop concluído para produto ${productId}`,
      data: {
        productId,
        anymarketId,
        processed: 3,
        testMode: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de crop em lote:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}
