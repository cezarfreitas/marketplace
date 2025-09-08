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
        SUM(CASE WHEN is_visible = 0 THEN 1 ELSE 0 END) as invisible_products,
        SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM images i JOIN skus s ON i.sku_id = s.id WHERE s.product_id = p.id) THEN 1 ELSE 0 END) as products_without_images,
        SUM(CASE WHEN EXISTS (SELECT 1 FROM images i JOIN skus s ON i.sku_id = s.id WHERE s.product_id = p.id) THEN 1 ELSE 0 END) as products_with_images,
        SUM(CASE WHEN EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_id = p.ref_id) THEN 1 ELSE 0 END) as products_in_anymarket,
        SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM anymarket a WHERE a.ref_id = p.ref_id) THEN 1 ELSE 0 END) as products_not_in_anymarket
      FROM products p
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
    const withoutImages = parseInt(stats.products_without_images) || 0;
    const withImages = parseInt(stats.products_with_images) || 0;
    const inAnymarket = parseInt(stats.products_in_anymarket) || 0;
    const notInAnymarket = parseInt(stats.products_not_in_anymarket) || 0;

    // Calcular percentuais
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
    const visiblePercentage = total > 0 ? Math.round((visible / total) * 100) : 0;
    const activeAndVisiblePercentage = total > 0 ? Math.round((activeAndVisible / total) * 100) : 0;
    const inactivePercentage = total > 0 ? Math.round((inactive / total) * 100) : 0;
    const invisiblePercentage = total > 0 ? Math.round((invisible / total) * 100) : 0;
    const withoutImagesPercentage = total > 0 ? Math.round((withoutImages / total) * 100) : 0;
    const withImagesPercentage = total > 0 ? Math.round((withImages / total) * 100) : 0;
    const inAnymarketPercentage = total > 0 ? Math.round((inAnymarket / total) * 100) : 0;
    const notInAnymarketPercentage = total > 0 ? Math.round((notInAnymarket / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        visible,
        activeAndVisible,
        inactive,
        invisible,
        withoutImages,
        withImages,
        inAnymarket,
        notInAnymarket,
        percentages: {
          active: activePercentage,
          visible: visiblePercentage,
          activeAndVisible: activeAndVisiblePercentage,
          inactive: inactivePercentage,
          invisible: invisiblePercentage,
          withoutImages: withoutImagesPercentage,
          withImages: withImagesPercentage,
          inAnymarket: inAnymarketPercentage,
          notInAnymarket: notInAnymarketPercentage
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

