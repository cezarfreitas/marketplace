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

    let query = `
      SELECT 
        pp.*,
        cpl.status as last_status,
        cpl.completed_at as last_completed_at,
        cpl.total_images as last_total_images,
        cpl.processed_images as last_processed_images
      FROM processed_products pp
      LEFT JOIN crop_processing_logs cpl ON pp.product_id = cpl.product_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (productId) {
      query += ' AND pp.product_id = ?';
      params.push(productId);
    }

    if (anymarketId) {
      query += ' AND pp.anymarket_id = ?';
      params.push(anymarketId);
    }

    query += ' ORDER BY cpl.started_at DESC LIMIT 1';

    const result = await executeQuery(query, params);

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          isProcessed: false,
          processedProduct: null
        }
      });
    }

    const processedProduct = result[0];

    return NextResponse.json({
      success: true,
      data: {
        isProcessed: true,
        processedProduct: {
          productId: processedProduct.product_id,
          anymarketId: processedProduct.anymarket_id,
          productName: processedProduct.product_name,
          lastProcessedAt: processedProduct.last_processed_at,
          totalProcessingCount: processedProduct.total_processing_count,
          lastStatus: processedProduct.last_status,
          lastCompletedAt: processedProduct.last_completed_at,
          lastTotalImages: processedProduct.last_total_images,
          lastProcessedImages: processedProduct.last_processed_images
        }
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
