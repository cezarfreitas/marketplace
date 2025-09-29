import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { checkBuildEnvironment } from '@/lib/build-check';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const vtexId = searchParams.get('vtexId');

    if (!vtexId) {
      return NextResponse.json({
        success: false,
        message: 'VTEX ID é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔍 Debugando produto VTEX ID: ${vtexId}`);

    // 1. Verificar se o produto existe
    const productQuery = `
      SELECT 
        id,
        vtex_id,
        name,
        ref_id,
        is_active,
        created_at,
        updated_at
      FROM products_vtex 
      WHERE vtex_id = ?
    `;

    const products = await executeQuery(productQuery, [vtexId]);
    console.log(`📦 Produtos encontrados: ${products.length}`);

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado no banco de dados',
        data: {
          vtexId: Number(vtexId),
          productExists: false,
          skusCount: 0
        }
      });
    }

    const product = products[0];
    console.log(`📦 Produto encontrado:`, product);

    // 2. Verificar SKUs do produto
    const skusQuery = `
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
        s.date_updated
      FROM skus_vtex s
      WHERE s.product_id = ?
      ORDER BY s.position ASC, s.name_complete ASC
    `;

    const skus = await executeQuery(skusQuery, [product.id]);
    console.log(`📋 SKUs encontrados: ${skus.length}`);

    // 3. Verificar se há dados na tabela meli
    const meliQuery = `
      SELECT 
        m.seller_sku,
        m.product_id
      FROM meli m
      WHERE m.product_id = ?
    `;

    const meliData = await executeQuery(meliQuery, [product.id]);
    console.log(`🛒 Dados Meli encontrados: ${meliData.length}`);

    return NextResponse.json({
      success: true,
      message: 'Debug concluído',
      data: {
        vtexId: Number(vtexId),
        product: product,
        productExists: true,
        skus: skus,
        skusCount: skus.length,
        meliData: meliData,
        meliDataCount: meliData.length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no debug do produto:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
