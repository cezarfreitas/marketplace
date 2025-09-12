import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeModificationQuery } from '@/lib/database';

// GET - Buscar logs de processamento
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando busca de logs de crop...');
    
    // Teste simples primeiro
    console.log('🧪 Testando conexão com banco...');
    const testQuery = 'SELECT COUNT(*) as total FROM crop_processing_logs';
    const testResult = await executeQuery(testQuery, []);
    console.log('✅ Teste de conexão bem-sucedido:', testResult);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 Parâmetros da busca:', { status, limit, offset });

    // Query simplificada primeiro
    let query = 'SELECT id, product_id, status FROM crop_processing_logs';
    const queryParams = [];
    
    if (status) {
      query += ' WHERE status = ?';
      queryParams.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 10';

    console.log('📝 Query SQL simplificada:', query);
    console.log('📝 Parâmetros:', queryParams);

    const logs = await executeQuery(query, queryParams);
    console.log('📊 Logs retornados:', logs);

    return NextResponse.json({
      success: true,
      logs: logs || [],
      pagination: {
        total: Array.isArray(logs) ? logs.length : 0,
        limit: 10,
        offset: 0,
        hasMore: false
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar logs de processamento:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
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

    // Salvar log na tabela crop_processing_logs
    const logResult = await executeQuery(`
      INSERT INTO crop_processing_logs (
        product_id, anymarket_id, product_name, status, total_images, details, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      productId,
      anymarketId,
      productName,
      status,
      totalImages || 0,
      details ? JSON.stringify(details) : null
    ]);

    const logId = (logResult as any).insertId;

    console.log('📝 Log de processamento salvo:', {
      logId,
      productId,
      anymarketId,
      productName,
      status,
      totalImages,
      details
    });

    return NextResponse.json({
      success: true,
      data: {
        logId: logId,
        message: 'Log de processamento registrado com sucesso'
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

    // Atualizar log na tabela crop_processing_logs
    const updateFields = [];
    const updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (processedImages !== undefined) {
      updateFields.push('processed_images = ?');
      updateValues.push(processedImages);
    }
    if (failedImages !== undefined) {
      updateFields.push('failed_images = ?');
      updateValues.push(failedImages);
    }
    if (pixianSuccessCount !== undefined) {
      updateFields.push('pixian_success_count = ?');
      updateValues.push(pixianSuccessCount);
    }
    if (pixianErrorCount !== undefined) {
      updateFields.push('pixian_error_count = ?');
      updateValues.push(pixianErrorCount);
    }
    if (anymarketSuccessCount !== undefined) {
      updateFields.push('anymarket_success_count = ?');
      updateValues.push(anymarketSuccessCount);
    }
    if (anymarketErrorCount !== undefined) {
      updateFields.push('anymarket_error_count = ?');
      updateValues.push(anymarketErrorCount);
    }
    if (processingTimeSeconds !== undefined) {
      updateFields.push('processing_time_seconds = ?');
      updateValues.push(processingTimeSeconds);
    }
    if (errorMessage) {
      updateFields.push('error_message = ?');
      updateValues.push(errorMessage);
    }
    if (details) {
      updateFields.push('details = ?');
      updateValues.push(JSON.stringify(details));
    }

    // Adicionar completed_at se status for completed ou failed
    if (status === 'completed' || status === 'failed') {
      updateFields.push('completed_at = CURRENT_TIMESTAMP');
    }

    updateValues.push(logId);

    const updateQuery = `
      UPDATE crop_processing_logs 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(updateQuery, updateValues);

    console.log('📝 Log de processamento atualizado:', {
      logId,
      status,
      processedImages,
      failedImages,
      updateFields
    });

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

