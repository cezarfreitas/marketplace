import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

// GET - Listar todos os lotes com filtros
export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    console.log(`🔄 Buscando lotes - Página: ${page}, Limite: ${limit}, Busca: "${search}", Status: "${status}"`);

    // Construir condições WHERE
    const whereConditions = [];
    const queryParams = [];

    if (search) {
      whereConditions.push('(b.name LIKE ? OR b.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereConditions.push('b.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Buscar total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM batches b 
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0]?.total || 0;

    // Buscar lotes com contagem de produtos
    const batchesQuery = `
      SELECT 
        b.id,
        b.name,
        b.description,
        b.status,
        b.total_products,
        b.imported_at,
        b.created_at,
        b.updated_at,
        COALESCE(p.product_count, 0) as actual_product_count
      FROM batches b
      LEFT JOIN (
        SELECT batch_id, COUNT(*) as product_count 
        FROM products_vtex 
        WHERE batch_id IS NOT NULL
        GROUP BY batch_id
      ) p ON b.id = p.batch_id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const batches = await executeQuery(batchesQuery, queryParams);

    console.log(`✅ ${batches.length} lotes encontrados`);

    return NextResponse.json({
      success: true,
      data: {
        batches: batches || [],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar lotes:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST - Criar novo lote
export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const body = await request.json();
    const { name, description, status = 'active' } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Nome do lote é obrigatório'
      }, { status: 400 });
    }

    console.log(`📝 Criando novo lote: ${name}`);

    const query = `
      INSERT INTO batches (name, description, status, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
    `;

    const result = await executeQuery(query, [name, description || null, status]);
    const batchId = (result as any).insertId;

    console.log(`✅ Lote criado com sucesso (ID: ${batchId})`);

    // Buscar o lote criado
    const batchQuery = `SELECT * FROM batches WHERE id = ?`;
    const batch = await executeQuery(batchQuery, [batchId]);

    return NextResponse.json({
      success: true,
      message: 'Lote criado com sucesso',
      data: batch[0]
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar lote:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Deletar múltiplos lotes
export async function DELETE(request: NextRequest) {
  try {
    // Evitar execução durante o build
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'IDs dos lotes são obrigatórios'
      }, { status: 400 });
    }

    console.log(`🗑️ Deletando ${ids.length} lote(s)...`);

    // Remover associação dos produtos primeiro
    const placeholders = ids.map(() => '?').join(',');
    await executeQuery(
      `UPDATE products_vtex SET batch_id = NULL WHERE batch_id IN (${placeholders})`,
      ids
    );

    await executeQuery(
      `UPDATE anymarket SET batch_id = NULL WHERE batch_id IN (${placeholders})`,
      ids
    );

    // Deletar lotes
    await executeQuery(
      `DELETE FROM batches WHERE id IN (${placeholders})`,
      ids
    );

    console.log(`✅ ${ids.length} lote(s) deletado(s) com sucesso`);

    return NextResponse.json({
      success: true,
      message: `${ids.length} lote(s) deletado(s) com sucesso`
    });

  } catch (error: any) {
    console.error('❌ Erro ao deletar lotes:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

