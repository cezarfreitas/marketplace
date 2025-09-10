import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeModificationQuery } from '@/lib/database';

// GET - Buscar logs de processamento
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const anymarketId = searchParams.get('anymarketId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        cpl.*,
        pp.total_processing_count,
        pp.last_processed_at as first_processed_at
      FROM crop_processing_logs cpl
      LEFT JOIN processed_products pp ON cpl.product_id = pp.product_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (productId) {
      query += ' AND cpl.product_id = ?';
      params.push(productId);
    }

    if (anymarketId) {
      query += ' AND cpl.anymarket_id = ?';
      params.push(anymarketId);
    }

    if (status) {
      query += ' AND cpl.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cpl.started_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = await executeQuery(query, params);

    // Buscar total de registros para paginação
    let countQuery = 'SELECT COUNT(*) as total FROM crop_processing_logs cpl WHERE 1=1';
    const countParams: any[] = [];

    if (productId) {
      countQuery += ' AND cpl.product_id = ?';
      countParams.push(productId);
    }

    if (anymarketId) {
      countQuery += ' AND cpl.anymarket_id = ?';
      countParams.push(anymarketId);
    }

    if (status) {
      countQuery += ' AND cpl.status = ?';
      countParams.push(status);
    }

    const [{ total }] = await executeQuery<{ total: number }>(countQuery, countParams);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar logs de processamento:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar logs de processamento',
      error: error.message
    }, { status: 500 });
  }
}

// POST - Criar novo log de processamento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      anymarketId,
      productName,
      status = 'processing',
      totalImages = 0,
      details = null
    } = body;

    if (!productId || !anymarketId || !productName) {
      return NextResponse.json({
        success: false,
        message: 'productId, anymarketId e productName são obrigatórios'
      }, { status: 400 });
    }

    const query = `
      INSERT INTO crop_processing_logs (
        product_id, anymarket_id, product_name, status, 
        total_images, details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await executeModificationQuery(query, [
      productId,
      anymarketId,
      productName,
      status,
      totalImages,
      details ? JSON.stringify(details) : null
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logId: result.insertId,
        message: 'Log de processamento criado com sucesso'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar log de processamento:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao criar log de processamento',
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Atualizar log de processamento
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      logId,
      status,
      processedImages = 0,
      failedImages = 0,
      pixianSuccessCount = 0,
      pixianErrorCount = 0,
      anymarketSuccessCount = 0,
      anymarketErrorCount = 0,
      processingTimeSeconds = 0,
      errorMessage = null,
      details = null
    } = body;

    if (!logId) {
      return NextResponse.json({
        success: false,
        message: 'logId é obrigatório'
      }, { status: 400 });
    }

    const query = `
      UPDATE crop_processing_logs SET
        status = ?,
        processed_images = ?,
        failed_images = ?,
        pixian_success_count = ?,
        pixian_error_count = ?,
        anymarket_success_count = ?,
        anymarket_error_count = ?,
        processing_time_seconds = ?,
        error_message = ?,
        details = ?,
        completed_at = CASE WHEN ? = 'completed' OR ? = 'failed' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = ?
    `;

    const result = await executeModificationQuery(query, [
      status,
      processedImages,
      failedImages,
      pixianSuccessCount,
      pixianErrorCount,
      anymarketSuccessCount,
      anymarketErrorCount,
      processingTimeSeconds,
      errorMessage,
      details ? JSON.stringify(details) : null,
      status,
      status,
      logId
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({
        success: false,
        message: 'Log não encontrado'
      }, { status: 404 });
    }

    // Se o processamento foi concluído com sucesso, marcar o produto como processado
    if (status === 'completed') {
      await markProductAsProcessed(body.productId, body.anymarketId, body.productName);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Log atualizado com sucesso'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar log de processamento:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar log de processamento',
      error: error.message
    }, { status: 500 });
  }
}

// Função auxiliar para marcar produto como processado
async function markProductAsProcessed(productId: number, anymarketId: string, productName: string) {
  try {
    // Verificar se o produto já foi processado antes
    const existingQuery = 'SELECT * FROM processed_products WHERE product_id = ?';
    const existing = await executeQuery(existingQuery, [productId]);

    if (existing.length > 0) {
      // Atualizar contador e data
      const updateQuery = `
        UPDATE processed_products SET
          total_processing_count = total_processing_count + 1,
          last_processed_at = NOW(),
          updated_at = NOW()
        WHERE product_id = ?
      `;
      await executeModificationQuery(updateQuery, [productId]);
    } else {
      // Inserir novo registro
      const insertQuery = `
        INSERT INTO processed_products (
          product_id, anymarket_id, product_name, 
          last_processed_at, total_processing_count
        ) VALUES (?, ?, ?, NOW(), 1)
      `;
      await executeModificationQuery(insertQuery, [productId, anymarketId, productName]);
    }
  } catch (error) {
    console.error('❌ Erro ao marcar produto como processado:', error);
    // Não falhar o processo principal por causa disso
  }
}
