import { NextRequest, NextResponse } from 'next/server';
import { vtexService } from '@/lib/vtex-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refId } = body;

    console.log(`🧪 Testando busca do produto RefId ${refId}...`);

    // Testar apenas a busca do produto
    const product = await vtexService.getProductByRefId(refId);

    return NextResponse.json({
      success: true,
      message: 'Produto encontrado!',
      data: {
        id: product.Id,
        name: product.Name,
        refId: product.RefId,
        brandId: product.BrandId,
        categoryId: product.CategoryId
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste',
      error: error.message
    }, { status: 400 });
  }
}
