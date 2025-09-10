import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔄 Buscando estatísticas de estoque...');

    // Query para contar total de SKUs
    const skusQuery = `
      SELECT COUNT(*) as total_skus
      FROM skus
    `;

    // Query para somar total de estoque
    const stockQuery = `
      SELECT COALESCE(SUM(total_quantity), 0) as total_stock
      FROM stock
    `;

    // Query para buscar última atualização (assumindo que há uma tabela de logs ou usando timestamp)
    const lastUpdateQuery = `
      SELECT MAX(updated_at) as last_update
      FROM stock
      WHERE updated_at IS NOT NULL
    `;

    const [skusResult, stockResult, lastUpdateResult] = await Promise.all([
      executeQuery(skusQuery),
      executeQuery(stockQuery),
      executeQuery(lastUpdateQuery)
    ]);

    const totalSkus = skusResult[0]?.total_skus || 0;
    const totalStock = stockResult[0]?.total_stock || 0;
    const lastUpdate = lastUpdateResult[0]?.last_update || null;

    console.log(`✅ Estatísticas carregadas: ${totalSkus} SKUs, ${totalStock} estoque total`);

    return NextResponse.json({
      success: true,
      data: {
        totalSkus: parseInt(totalSkus),
        totalStock: parseInt(totalStock),
        lastUpdate
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar estatísticas de estoque:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar estatísticas de estoque',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
