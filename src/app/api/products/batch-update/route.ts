import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

// POST - Atualizar produtos em lote (adicionar a um lote)
export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const body = await request.json();
    const { productIds, batchId } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'IDs dos produtos são obrigatórios'
      }, { status: 400 });
    }

    if (batchId === undefined || batchId === null) {
      return NextResponse.json({
        success: false,
        error: 'ID do lote é obrigatório'
      }, { status: 400 });
    }

    console.log(`📝 Atualizando ${productIds.length} produto(s) para lote ${batchId}...`);

    // Atualizar products_vtex
    const placeholders = productIds.map(() => '?').join(',');
    const updateProductsQuery = `
      UPDATE products_vtex 
      SET batch_id = ?, updated_at = NOW() 
      WHERE id_produto_vtex IN (${placeholders})
    `;
    
    await executeQuery(updateProductsQuery, [batchId, ...productIds]);

    // Atualizar anymarket também (produtos que têm registro)
    const updateAnymarketQuery = `
      UPDATE anymarket a
      INNER JOIN products_vtex p ON a.ref_produto_vtex = p.ref_produto
      SET a.batch_id = ?
      WHERE p.id_produto_vtex IN (${placeholders})
    `;
    
    await executeQuery(updateAnymarketQuery, [batchId, ...productIds]);

    // Atualizar contagem do lote
    if (batchId > 0) {
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM products_vtex 
        WHERE batch_id = ?
      `;
      const countResult = await executeQuery(countQuery, [batchId]);
      const totalProducts = countResult[0]?.total || 0;

      const updateBatchQuery = `
        UPDATE batches 
        SET total_products = ?, updated_at = NOW() 
        WHERE id = ?
      `;
      await executeQuery(updateBatchQuery, [totalProducts, batchId]);
    }

    console.log(`✅ ${productIds.length} produto(s) atualizado(s) com sucesso`);

    return NextResponse.json({
      success: true,
      message: `${productIds.length} produto(s) atualizado(s) com sucesso`,
      data: {
        updatedCount: productIds.length,
        batchId
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar produtos em lote:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

