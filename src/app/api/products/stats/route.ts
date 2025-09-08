import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    // Query para obter estatísticas de produtos
    const statsQuery = `
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN is_visible = 1 THEN 1 ELSE 0 END) as visible_products,
        SUM(CASE WHEN is_active = 1 AND is_visible = 1 THEN 1 ELSE 0 END) as active_and_visible_products,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_products,
        SUM(CASE WHEN is_visible = 0 THEN 1 ELSE 0 END) as invisible_products
      FROM products
    `;

    const result = await executeQuery(statsQuery);
    const stats = result[0];

    if (!stats) {
      return NextResponse.json({
        success: false,
        message: 'Não foi possível obter estatísticas dos produtos'
      }, { status: 500 });
    }

    const total = parseInt(stats.total_products) || 0;
    const active = parseInt(stats.active_products) || 0;
    const visible = parseInt(stats.visible_products) || 0;
    const activeAndVisible = parseInt(stats.active_and_visible_products) || 0;
    const inactive = parseInt(stats.inactive_products) || 0;
    const invisible = parseInt(stats.invisible_products) || 0;

    // Calcular percentuais
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
    const visiblePercentage = total > 0 ? Math.round((visible / total) * 100) : 0;
    const activeAndVisiblePercentage = total > 0 ? Math.round((activeAndVisible / total) * 100) : 0;
    const inactivePercentage = total > 0 ? Math.round((inactive / total) * 100) : 0;
    const invisiblePercentage = total > 0 ? Math.round((invisible / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        visible,
        activeAndVisible,
        inactive,
        invisible,
        percentages: {
          active: activePercentage,
          visible: visiblePercentage,
          activeAndVisible: activeAndVisiblePercentage,
          inactive: inactivePercentage,
          invisible: invisiblePercentage
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar estatísticas de produtos:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar estatísticas de produtos'
    }, { status: 500 });
  }
}

