import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔄 Buscando dados reais do dashboard...');

    // Query para buscar total de produtos
    const totalProductsQuery = `SELECT COUNT(*) as total FROM products_vtex`;
    
    let total = 0;
    try {
      const result = await executeQuery(totalProductsQuery);
      total = parseInt(result[0]?.total) || 0;
      console.log('✅ Total de produtos obtido do banco:', total);
    } catch (dbError) {
      console.log('⚠️ Erro ao consultar banco, usando valor padrão:', dbError);
      total = 0; // Valor padrão se houver erro no banco
    }

    // Query para buscar total de estoque
    const totalStockQuery = `
      SELECT COALESCE(SUM(st.available_quantity), 0) as totalStock
      FROM skus_vtex s
      LEFT JOIN stock_vtex st ON s.id = st.sku_id
    `;
    
    let totalStock = 0;
    try {
      const stockResult = await executeQuery(totalStockQuery);
      totalStock = parseInt(stockResult[0]?.totalStock) || 0;
      console.log('✅ Total de estoque obtido do banco:', totalStock);
    } catch (dbError) {
      console.log('⚠️ Erro ao consultar estoque, usando valor padrão:', dbError);
      totalStock = 0; // Valor padrão se houver erro no banco
    }

    // Query para buscar produtos totalmente otimizados (sem marketplace)
    const optimizedQuery = `
      SELECT COUNT(*) as totalOptimized
      FROM products_vtex p
      WHERE EXISTS (SELECT 1 FROM analise_imagens ai WHERE ai.id_produto = p.id)
        AND EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_vtex = p.ref_id)
        AND EXISTS (SELECT 1 FROM anymarket_sync_logs asl WHERE asl.product_id = p.id)
        AND EXISTS (SELECT 1 FROM crop_processing_logs cpl WHERE cpl.product_id = p.id AND cpl.status = 'completed')
    `;
    
    let totalOptimized = 0;
    try {
      const optimizedResult = await executeQuery(optimizedQuery);
      totalOptimized = parseInt(optimizedResult[0]?.totalOptimized) || 0;
      console.log('✅ Total de produtos otimizados obtido do banco:', totalOptimized);
    } catch (dbError) {
      console.log('⚠️ Erro ao consultar produtos otimizados, usando valor padrão:', dbError);
      totalOptimized = 0; // Valor padrão se houver erro no banco
    }

    const stats = {
      total,
      totalStock,
      totalOptimized
    };

    console.log('✅ Estatísticas retornadas:', stats);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}