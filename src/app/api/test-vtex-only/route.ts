import { NextRequest, NextResponse } from 'next/server';
import { vtexService } from '@/lib/vtex-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testando apenas busca VTEX...');
    
    const body = await request.json();
    const { refId } = body;
    
    if (!refId) {
      return NextResponse.json({
        success: false,
        message: 'RefId é obrigatório'
      }, { status: 400 });
    }

    console.log(`📡 Buscando produto RefId ${refId}...`);
    const product = await vtexService.getProductByRefId(refId);
    console.log(`✅ Produto encontrado:`, product.Name);

    return NextResponse.json({
      success: true,
      message: `Produto ${refId} encontrado!`,
      data: {
        product: product
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na busca VTEX:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro na busca VTEX',
      error: error.message
    }, { status: 400 });
  }
}
