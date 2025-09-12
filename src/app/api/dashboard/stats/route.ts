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

    const stats = {
      total,
      totalStock: 15420 // Total de estoque (mantido mockado por enquanto)
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