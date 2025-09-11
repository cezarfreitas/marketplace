import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Estatísticas gerais da nova estrutura da tabela anymarket
    const totalStatsResult = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        MAX(updated_at) as lastUpdated
      FROM anymarket
    `);

    const totalStats = Array.isArray(totalStatsResult) ? totalStatsResult[0] : totalStatsResult;

    // Estatísticas por produto VTEX
    const vtexStatsResult = await executeQuery(`
      SELECT 
        COUNT(DISTINCT ref_vtex) as unique_vtex_products,
        COUNT(DISTINCT id_produto_any) as unique_anymarket_products
      FROM anymarket
    `);

    const vtexStats = Array.isArray(vtexStatsResult) ? vtexStatsResult[0] : vtexStatsResult;

    // Últimas sincronizações
    const recentSyncsResult = await executeQuery(`
      SELECT 
        id,
        ref_vtex,
        id_produto_any,
        created_at,
        updated_at
      FROM anymarket 
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 10
    `);

    const recentSyncs = Array.isArray(recentSyncsResult) ? recentSyncsResult : [recentSyncsResult];

    return NextResponse.json({
      success: true,
      data: {
        total: totalStats?.total || 0,
        lastUpdated: totalStats?.lastUpdated || null,
        uniqueVtexProducts: vtexStats?.unique_vtex_products || 0,
        uniqueAnymarketProducts: vtexStats?.unique_anymarket_products || 0,
        recentSyncs: recentSyncs
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar estatísticas anymarket:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}