import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    if (!productId || isNaN(Number(productId))) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto inválido'
      }, { status: 400 });
    }

    console.log(`🔍 Buscando SKUs para produto ID: ${productId}`);

    const query = `
      SELECT 
        s.id,
        s.vtex_id,
        s.name_complete as sku_name,
        s.product_ref_id,
        s.manufacturer_code as ean,
        s.is_active,
        s.product_id,
        s.sku_name,
        s.brand_name,
        s.image_url,
        s.detail_url,
        s.created_at,
        s.updated_at,
        p.name as product_name,
        p.ref_id as product_ref_id,
        p.id as product_vtex_id,
        m.seller_sku
      FROM skus_vtex s
      INNER JOIN products_vtex p ON s.product_id = p.id
      LEFT JOIN meli m ON p.id = m.product_id
      WHERE s.product_id = ?
      ORDER BY s.name_complete ASC, s.id ASC
    `;

    const skus = await executeQuery(query, [productId]);

    console.log(`✅ Encontrados ${skus.length} SKUs para produto ID ${productId}`);

    return NextResponse.json({
      success: true,
      message: `${skus.length} SKUs encontrados para o produto`,
      data: {
        skus,
        productId: Number(productId),
        totalSkus: skus.length,
        activeSkus: skus.filter((sku: any) => sku.is_active).length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar SKUs do produto:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}