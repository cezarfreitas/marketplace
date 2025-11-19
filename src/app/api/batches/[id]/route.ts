import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

// GET - Buscar lote específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Evitar execução durante o build
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const batchId = parseInt(params.id);

    if (isNaN(batchId)) {
      return NextResponse.json({
        success: false,
        error: 'ID do lote inválido'
      }, { status: 400 });
    }

    console.log(`🔍 Buscando lote ID: ${batchId}`);

    // Buscar lote com contagem de produtos
    const query = `
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
        WHERE batch_id = ?
      ) p ON b.id = p.batch_id
      WHERE b.id = ?
    `;

    const result = await executeQuery(query, [batchId, batchId]);

    if (!result || result.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Lote não encontrado'
      }, { status: 404 });
    }

    console.log(`✅ Lote encontrado: ${result[0].name}`);

    return NextResponse.json({
      success: true,
      data: result[0]
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar lote:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Atualizar lote
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Evitar execução durante o build
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const batchId = parseInt(params.id);

    if (isNaN(batchId)) {
      return NextResponse.json({
        success: false,
        error: 'ID do lote inválido'
      }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, status } = body;

    console.log(`📝 Atualizando lote ID: ${batchId}`);

    // Construir query de atualização dinamicamente
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum campo para atualizar'
      }, { status: 400 });
    }

    values.push(batchId);

    const query = `
      UPDATE batches 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(query, values);

    // Buscar lote atualizado
    const batchQuery = `SELECT * FROM batches WHERE id = ?`;
    const batch = await executeQuery(batchQuery, [batchId]);

    console.log(`✅ Lote atualizado com sucesso`);

    return NextResponse.json({
      success: true,
      message: 'Lote atualizado com sucesso',
      data: batch[0]
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar lote:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Deletar lote específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Evitar execução durante o build
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const batchId = parseInt(params.id);

    if (isNaN(batchId)) {
      return NextResponse.json({
        success: false,
        error: 'ID do lote inválido'
      }, { status: 400 });
    }

    console.log(`🗑️ Deletando lote ID: ${batchId}`);

    // Remover associação dos produtos
    await executeQuery('UPDATE products_vtex SET batch_id = NULL WHERE batch_id = ?', [batchId]);
    await executeQuery('UPDATE anymarket SET batch_id = NULL WHERE batch_id = ?', [batchId]);

    // Deletar lote
    await executeQuery('DELETE FROM batches WHERE id = ?', [batchId]);

    console.log(`✅ Lote deletado com sucesso`);

    return NextResponse.json({
      success: true,
      message: 'Lote deletado com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao deletar lote:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

