import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// GET - Verificar se produto foi processado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const anymarketId = searchParams.get('anymarketId');

    if (!productId && !anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'productId ou anymarketId é obrigatório'
      }, { status: 400 });
    }

    // Como as tabelas processed_products e crop_processing_logs não existem,
    // vamos sempre retornar que o produto não foi processado
    return NextResponse.json({
      success: true,
      data: {
        isProcessed: false,
        processedProduct: null
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar produto processado:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar produto processado',
      error: error.message
    }, { status: 500 });
  }
}
