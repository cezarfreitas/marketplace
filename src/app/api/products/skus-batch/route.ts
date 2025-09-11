import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de IDs de produtos é obrigatória'
      }, { status: 400 });
    }

    console.log('🔍 Buscando SKUs para produtos:', productIds);

    // Criar placeholders para a query IN
    const placeholders = productIds.map(() => '?').join(',');
    
    const query = `
      SELECT 
        s.id,
        s.name as sku_name,
        s.complement_name,
        s.product_ref_id as ref_id,
        s.manufacturer_code as ean,
        0 as stock,
        s.reward_value as price,
        s.is_active,
        s.product_id,
        p.name as product_name,
        p.ref_id as product_ref_id
      FROM skus_vtex s
      INNER JOIN products_vtex p ON s.product_id = p.id
      WHERE s.product_id IN (${placeholders})
      ORDER BY p.name ASC, s.name ASC
    `;

    const skus = await executeQuery(query, productIds);

    console.log(`✅ Encontrados ${skus.length} SKUs para ${productIds.length} produtos`);

    return NextResponse.json({
      success: true,
      message: `${skus.length} SKUs encontrados para ${productIds.length} produtos`,
      data: {
        skus,
        totalSkus: skus.length,
        totalProducts: productIds.length,
        activeSkus: skus.filter((sku: any) => sku.is_active).length,
        totalStock: skus.reduce((sum: number, sku: any) => sum + (sku.stock || 0), 0)
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar SKUs em lote:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}
