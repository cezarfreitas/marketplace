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

    // Verificar se o produto existe primeiro
    const productCheck = await executeQuery('SELECT id, name FROM products_vtex WHERE id = ?', [productId]);
    console.log(`📋 Produto encontrado:`, productCheck);

    if (productCheck.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    // Query simplificada para debug
    const query = `
      SELECT 
        s.id,
        s.vtex_id,
        s.name_complete as sku_name,
        s.product_id,
        s.is_active,
        p.name as product_name
      FROM skus_vtex s
      INNER JOIN products_vtex p ON s.product_id = p.id
      WHERE s.product_id = ?
      ORDER BY s.id ASC
    `;

    console.log(`🔍 Executando query:`, query);
    console.log(`🔍 Com parâmetros:`, [productId]);
    
    const skus = await executeQuery(query, [productId]);

    console.log(`✅ Encontrados ${skus.length} SKUs para produto ID ${productId}`);
    console.log(`📋 Primeiros 3 SKUs:`, skus.slice(0, 3));

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