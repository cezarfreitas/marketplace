import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// GET - Listar mapeamentos anymarket
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const syncStatus = searchParams.get('sync_status');
    const mappingType = searchParams.get('mapping_type');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Construir query com filtros
    const whereConditions = [];
    const queryParams: any[] = [];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (syncStatus) {
      whereConditions.push('sync_status = ?');
      queryParams.push(syncStatus);
    }

    if (mappingType) {
      whereConditions.push('mapping_type = ?');
      queryParams.push(mappingType);
    }

    if (search) {
      whereConditions.push('(vtex_name LIKE ? OR anymarket_name LIKE ? OR vtex_ref_id LIKE ? OR anymarket_sku LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Buscar dados
    const data = await executeQuery(`
      SELECT 
        id, vtex_id, anymarket_id, vtex_name, anymarket_name,
        vtex_ref_id, anymarket_sku, mapping_type, status, sync_status,
        last_sync_at, error_message, created_at, updated_at
      FROM anymarket 
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    // Contar total
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total 
      FROM anymarket 
      ${whereClause}
    `, queryParams);

    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar dados anymarket:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// POST - Criar novo mapeamento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vtex_id,
      anymarket_id,
      vtex_name,
      anymarket_name,
      vtex_ref_id,
      anymarket_sku,
      mapping_type = 'product',
      status = 'active',
      sync_status = 'not_synced'
    } = body;

    if (!vtex_id || !anymarket_id) {
      return NextResponse.json({
        success: false,
        message: 'vtex_id e anymarket_id são obrigatórios'
      }, { status: 400 });
    }

    // Inserir novo mapeamento
    const result = await executeQuery(`
      INSERT INTO anymarket (
        vtex_id, anymarket_id, vtex_name, anymarket_name,
        vtex_ref_id, anymarket_sku, mapping_type, status, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vtex_id, anymarket_id, vtex_name, anymarket_name,
      vtex_ref_id, anymarket_sku, mapping_type, status, sync_status
    ]);

    return NextResponse.json({
      success: true,
      message: 'Mapeamento criado com sucesso',
      data: { id: (result as any)?.insertId }
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar mapeamento anymarket:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({
        success: false,
        message: 'Mapeamento já existe para este vtex_id e anymarket_id'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// PUT - Atualizar mapeamento
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      vtex_id,
      anymarket_id,
      vtex_name,
      anymarket_name,
      vtex_ref_id,
      anymarket_sku,
      mapping_type,
      status,
      sync_status,
      error_message
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID é obrigatório'
      }, { status: 400 });
    }

    // Atualizar mapeamento
    await executeQuery(`
      UPDATE anymarket 
      SET 
        vtex_id = COALESCE(?, vtex_id),
        anymarket_id = COALESCE(?, anymarket_id),
        vtex_name = COALESCE(?, vtex_name),
        anymarket_name = COALESCE(?, anymarket_name),
        vtex_ref_id = COALESCE(?, vtex_ref_id),
        anymarket_sku = COALESCE(?, anymarket_sku),
        mapping_type = COALESCE(?, mapping_type),
        status = COALESCE(?, status),
        sync_status = COALESCE(?, sync_status),
        error_message = COALESCE(?, error_message),
        last_sync_at = CASE WHEN ? IS NOT NULL THEN NOW() ELSE last_sync_at END,
        updated_at = NOW()
      WHERE id = ?
    `, [
      vtex_id, anymarket_id, vtex_name, anymarket_name,
      vtex_ref_id, anymarket_sku, mapping_type, status, sync_status,
      error_message, sync_status, id
    ]);

    return NextResponse.json({
      success: true,
      message: 'Mapeamento atualizado com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar mapeamento anymarket:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// DELETE - Deletar mapeamento
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID é obrigatório'
      }, { status: 400 });
    }

    await executeQuery('DELETE FROM anymarket WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Mapeamento deletado com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao deletar mapeamento anymarket:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}