import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vtexId = params.id;

    if (!vtexId || isNaN(Number(vtexId))) {
      return NextResponse.json({
        success: false,
        message: 'VTEX ID do produto inválido'
      }, { status: 400 });
    }

    console.log(`🔍 Buscando SKUs para produto VTEX ID: ${vtexId}`);

    const query = `
      SELECT 
        s.id,
        s.name_complete as sku_name,
        s.ref_id as sku_ref_id,
        s.product_ref_id as product_ref_id,
        s.manufacturer_code as ean,
        s.is_active,
        s.product_id,
        s.vtex_id as sku_vtex_id,
        s.height,
        s.width,
        s.length,
        s.weight_kg,
        s.position,
        s.date_updated,
        p.name as product_name,
        p.ref_id as product_ref_id,
        p.vtex_id as product_vtex_id,
        m.seller_sku
      FROM skus_vtex s
      INNER JOIN products_vtex p ON s.product_id = p.id
      LEFT JOIN meli m ON p.id = m.product_id
      WHERE p.vtex_id = ?
      ORDER BY s.position ASC, s.name_complete ASC
    `;

    const skus = await executeQuery(query, [vtexId]);

    console.log(`✅ Encontrados ${skus.length} SKUs para produto VTEX ID ${vtexId}`);

    return NextResponse.json({
      success: true,
      message: `${skus.length} SKUs encontrados para o produto`,
      data: {
        skus,
        vtexId: Number(vtexId),
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