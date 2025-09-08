import { NextRequest, NextResponse } from 'next/server';
import { vtexService } from '@/lib/vtex-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refId } = body;

    console.log(`🧪 Testando importação completa do produto RefId ${refId}...`);

    // Testar cada etapa separadamente
    const product = await vtexService.getProductByRefId(refId);
    console.log('✅ Produto encontrado:', product.Name);

    const brand = await vtexService.getBrand(product.BrandId);
    console.log('✅ Marca encontrada:', brand.name);

    const category = await vtexService.getCategory(product.CategoryId);
    console.log('✅ Categoria encontrada:', category.Name);

    const skus = await vtexService.getProductSKUs(product.Id);
    console.log('✅ SKUs encontrados:', skus.length);

    return NextResponse.json({
      success: true,
      message: 'Importação completa testada com sucesso!',
      data: {
        product: {
          id: product.Id,
          name: product.Name,
          refId: product.RefId
        },
        brand: {
          id: brand.id,
          name: brand.name
        },
        category: {
          id: category.Id,
          name: category.Name
        },
        skuCount: skus.length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste completo:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste completo',
      error: error.message
    }, { status: 400 });
  }
}
